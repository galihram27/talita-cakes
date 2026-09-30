import AppError from "../../utils/appError.js";

/**
 * Satu-satunya berkas yang mengenal penyedia model (saat ini Groq).
 *
 * Kode lain berbicara dengan format pesan milik kita sendiri
 * ({ role: "user" | "assistant", text }) dan definisi tool berbentuk JSON
 * Schema biasa. Karena itu penyedia bisa diganti dengan menulis ulang berkas
 * ini saja, seperti saat pindah dari Gemini ke Groq.
 *
 * Groq memakai format API yang sama dengan OpenAI, jadi dipanggil langsung
 * dengan fetch tanpa SDK tambahan.
 */

const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Tanpa batas waktu, request yang menggantung ikut menahan pembeli tanpa
// jawaban. 30 detik sudah jauh di atas waktu balas Groq yang normal.
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 1500;

// reasoning_effort sengaja dibiarkan bawaan. Dengan "low", gpt-oss-120b
// terukur lebih cepat tapi sering melewatkan tool dan menjawab "produk
// tidak ada" untuk produk yang dijual.

const getConfig = () => {
   const apiKey = process.env.GROQ_API_KEY;
   const model = process.env.GROQ_MODEL;

   if (!apiKey || !model) {
      throw new AppError(
         "Chat belum dikonfigurasi (GROQ_API_KEY / GROQ_MODEL)",
         503
      );
   }

   return { apiKey, model };
};

const toApiMessages = (systemPrompt, messages) => [
   { role: "system", content: systemPrompt },
   ...messages.map((message) => ({
      role: message.role,
      content: message.text,
   })),
];

const toApiTools = (tools) =>
   tools.length === 0
      ? undefined
      : tools.map((tool) => ({
           type: "function",
           function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
           },
        }));

// Pesan error mentah dari penyedia (nama model, kuota, dsb.) tidak pantas
// sampai ke pembeli. Yang diteruskan hanya status yang bisa ditindaklanjuti.
const toAppError = (status) => {
   if (status === 429) {
      return new AppError(
         "Asisten sedang menerima terlalu banyak pertanyaan. Coba lagi sebentar lagi.",
         429
      );
   }

   if (status === 503 || status === "timeout") {
      return new AppError(
         "Asisten sedang sibuk. Coba lagi sebentar lagi.",
         503
      );
   }

   return new AppError("Asisten sedang tidak bisa menjawab.", 502);
};

const toNetworkError = (err) => {
   // AbortError berarti pembeli sendiri yang menutup koneksi, bukan gangguan.
   if (err.name !== "AbortError") {
      console.error("Chat API network error:", err.name, err.message);
   }
   return toAppError(err.name === "TimeoutError" ? "timeout" : "network");
};

// Batas waktu berlaku untuk satu request utuh, termasuk selama stream
// dibaca. `signal` dari pemanggil ikut digabung, supaya request ke penyedia
// berhenti begitu pembeli menutup koneksinya.
const openStream = async (apiKey, body, signal) => {
   const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS), signal];

   let response;
   try {
      response = await fetch(API_URL, {
         method: "POST",
         headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
         },
         body: JSON.stringify({ ...body, stream: true }),
         signal: AbortSignal.any(signals.filter(Boolean)),
      });
   } catch (err) {
      throw toNetworkError(err);
   }

   if (!response.ok) {
      console.error("Chat API error:", response.status, await response.text());
      throw toAppError(response.status);
   }

   return response;
};

// 503 ("server sedang ramai") biasanya hilang dalam hitungan detik. Tanpa
// percobaan ulang, satu 503 di tengah loop tool membuang langkah yang sudah
// berhasil. Hanya 503 yang diulang: 429 berarti kuota habis, mengulanginya
// justru menambah beban. Pengulangan hanya mungkin sebelum stream dibaca,
// karena status diketahui sebelum isi pertama tiba.
const openStreamWithRetry = async (apiKey, body, signal) => {
   try {
      return await openStream(apiKey, body, signal);
   } catch (err) {
      if (err.statusCode !== 503) throw err;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return openStream(apiKey, body, signal);
   }
};

// Membaca stream SSE dari penyedia: baris "data: {...}" dipisah baris
// kosong, diakhiri "data: [DONE]". Satu potongan jaringan bisa berisi
// setengah baris, jadi sisanya ditahan sampai potongan berikutnya tiba.
async function* readChunks(response) {
   const decoder = new TextDecoder();
   let buffer = "";

   for await (const bytes of response.body) {
      buffer += decoder.decode(bytes, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
         if (!line.startsWith("data: ")) continue;
         const data = line.slice("data: ".length).trim();
         if (data === "[DONE]") return;
         yield JSON.parse(data);
      }
   }
}

/**
 * Membaca satu langkah dari stream. Teks diteruskan ke `onDelta` begitu
 * tiba. Permintaan tool datang terpotong-potong (nama dan argumen JSON
 * dicicil), jadi dirakit per `index` sampai stream selesai.
 */
const readStep = async (response, onDelta) => {
   let content = "";
   const calls = [];
   let usage = null;
   let streamError = null;

   try {
      for await (const chunk of readChunks(response)) {
         // Kegagalan setelah status 200 datang sebagai potongan berisi
         // `error`. Tanpa pengecekan ini, jawaban setengah jadi dianggap
         // berhasil.
         if (chunk.error) {
            streamError = chunk.error;
            break;
         }

         const delta = chunk.choices?.[0]?.delta ?? {};

         if (delta.content) {
            content += delta.content;
            onDelta?.(delta.content);
         }

         for (const part of delta.tool_calls ?? []) {
            calls[part.index] ??= {
               id: "",
               type: "function",
               function: { name: "", arguments: "" },
            };
            const call = calls[part.index];
            if (part.id) call.id = part.id;
            call.function.name += part.function?.name ?? "";
            call.function.arguments += part.function?.arguments ?? "";
         }

         // Groq menaruh pemakaian token di potongan terakhir, di x_groq.
         usage = chunk.x_groq?.usage ?? chunk.usage ?? usage;
      }
   } catch (err) {
      throw toNetworkError(err);
   }

   if (streamError) {
      console.error("Chat API stream error:", JSON.stringify(streamError));
      throw toAppError(streamError.status_code);
   }

   return { content, calls: calls.filter(Boolean), usage };
};

// Argumen tool datang sebagai teks JSON buatan model. Kalau rusak, tool
// dijalankan tanpa argumen dan pengecekan di chat.tools.js yang menolaknya,
// daripada seluruh percakapan gagal.
const parseArgs = (text) => {
   try {
      return JSON.parse(text || "{}");
   } catch {
      return {};
   }
};

/**
 * Kirim percakapan ke model dan kembalikan balasannya.
 *
 * Kalau model meminta tool, `runTool` dijalankan lalu hasilnya dikirim balik,
 * berulang sampai model menjawab dengan teks. Satu pertanyaan pembeli bisa
 * berarti beberapa request, karena itu dibatasi `maxSteps`: tanpa batas,
 * model yang terus meminta tool akan menguras kuota tanpa henti.
 *
 * Request ke penyedia selalu memakai stream. Kalau `onDelta` diisi, teks
 * diteruskan begitu tiba; kalau tidak, hasilnya cukup dikumpulkan.
 *
 * `text` berisi seluruh teks yang sudah dikirim model, termasuk kalimat
 * pengantar sebelum ia meminta tool, supaya sama persis dengan yang dilihat
 * pembeli lewat stream. Nilainya kosong kalau batas langkah tercapai sebelum
 * ada jawaban; pemanggil yang menentukan pesan penggantinya.
 */
export const generateReply = async ({
   messages,
   systemPrompt,
   tools = [],
   runTool,
   maxSteps,
   onDelta,
   signal,
}) => {
   const { apiKey, model } = getConfig();
   const apiMessages = toApiMessages(systemPrompt, messages);
   const apiTools = toApiTools(tools);
   let text = "";
   let totalTokens = 0;

   for (let step = 0; step < maxSteps; step++) {
      const response = await openStreamWithRetry(
         apiKey,
         { model, messages: apiMessages, tools: apiTools },
         signal
      );
      const { content, calls, usage } = await readStep(response, onDelta);

      text += content;
      totalTokens += usage?.total_tokens ?? 0;

      if (calls.length === 0) {
         return { text, totalTokens, steps: step + 1 };
      }

      // Permintaan tool dari model wajib ikut di riwayat, dan tiap hasil
      // dikaitkan lewat tool_call_id. Tanpa itu model tidak tahu hasil mana
      // menjawab permintaan yang mana.
      apiMessages.push({
         role: "assistant",
         content: content || null,
         tool_calls: calls,
      });

      const results = await Promise.all(
         calls.map((call) =>
            runTool(call.function.name, parseArgs(call.function.arguments))
         )
      );

      calls.forEach((call, i) => {
         apiMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(results[i]),
         });
      });
   }

   return { text, totalTokens, steps: maxSteps };
};
