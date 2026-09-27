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

const post = async (apiKey, body) => {
   let response;
   try {
      response = await fetch(API_URL, {
         method: "POST",
         headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
         },
         body: JSON.stringify(body),
         signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
   } catch (err) {
      console.error("Chat API network error:", err.name, err.message);
      throw toAppError(err.name === "TimeoutError" ? "timeout" : "network");
   }

   if (!response.ok) {
      console.error("Chat API error:", response.status, await response.text());
      throw toAppError(response.status);
   }

   return response.json();
};

// 503 ("server sedang ramai") biasanya hilang dalam hitungan detik. Tanpa
// percobaan ulang, satu 503 di tengah loop tool membuang langkah yang sudah
// berhasil. Hanya 503 yang diulang: 429 berarti kuota habis, mengulanginya
// justru menambah beban.
const postWithRetry = async (apiKey, body) => {
   try {
      return await post(apiKey, body);
   } catch (err) {
      if (err.statusCode !== 503) throw err;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return post(apiKey, body);
   }
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
 * `text` bernilai null kalau batas itu tercapai sebelum ada jawaban;
 * pemanggil yang menentukan pesan penggantinya.
 */
export const generateReply = async ({
   messages,
   systemPrompt,
   tools = [],
   runTool,
   maxSteps,
}) => {
   const { apiKey, model } = getConfig();
   const apiMessages = toApiMessages(systemPrompt, messages);
   const apiTools = toApiTools(tools);
   let totalTokens = 0;

   for (let step = 0; step < maxSteps; step++) {
      const data = await postWithRetry(apiKey, {
         model,
         messages: apiMessages,
         tools: apiTools,
      });

      totalTokens += data.usage?.total_tokens ?? 0;
      const message = data.choices[0].message;
      const calls = message.tool_calls ?? [];

      if (calls.length === 0) {
         return { text: message.content ?? "", totalTokens, steps: step + 1 };
      }

      // Permintaan tool dari model wajib ikut di riwayat, dan tiap hasil
      // dikaitkan lewat tool_call_id. Tanpa itu model tidak tahu hasil mana
      // menjawab permintaan yang mana.
      apiMessages.push({
         role: "assistant",
         content: message.content ?? null,
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

   return { text: null, totalTokens, steps: maxSteps };
};
