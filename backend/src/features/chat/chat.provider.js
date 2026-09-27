import { GoogleGenAI, ApiError } from "@google/genai";
import AppError from "../../utils/appError.js";

/**
 * Satu-satunya berkas yang mengenal Google Gemini.
 *
 * Kode lain berbicara dengan format pesan milik kita sendiri
 * ({ role: "user" | "assistant", text }), bukan format Gemini. Jadi kalau
 * suatu saat penyedia model diganti, cukup berkas ini yang ditulis ulang.
 */

// Client dibuat saat pertama dipakai, bukan saat modul dimuat. Dengan begitu
// server tetap bisa menyala walaupun GEMINI_API_KEY belum diisi, dan hanya
// endpoint chat yang menolak.
let client = null;

const getClient = () => {
   const apiKey = process.env.GEMINI_API_KEY;
   const model = process.env.GEMINI_MODEL;

   if (!apiKey || !model) {
      throw new AppError(
         "Chat belum dikonfigurasi (GEMINI_API_KEY / GEMINI_MODEL)",
         503
      );
   }

   if (!client) client = new GoogleGenAI({ apiKey });
   return { client, model };
};

// Gemini menamai giliran asisten "model". Nama itu sengaja tidak dibocorkan
// keluar berkas ini.
const toGeminiContents = (messages) =>
   messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
   }));

// Pesan error mentah dari Google (nama model, kuota, dsb.) tidak pantas
// sampai ke pembeli. Yang diteruskan hanya status yang bisa ditindaklanjuti.
const toAppError = (err) => {
   if (!(err instanceof ApiError)) return err;

   console.error("Gemini API error:", err.status, err.message);

   if (err.status === 429) {
      return new AppError(
         "Asisten sedang menerima terlalu banyak pertanyaan. Coba lagi sebentar lagi.",
         429
      );
   }

   if (err.status === 503) {
      return new AppError(
         "Asisten sedang sibuk. Coba lagi sebentar lagi.",
         503
      );
   }

   return new AppError("Asisten sedang tidak bisa menjawab.", 502);
};

/**
 * Kirim riwayat percakapan ke Gemini dan kembalikan balasannya.
 *
 * `usage` ikut dikembalikan supaya pemanggil bisa mencatat pemakaian token,
 * walaupun belum dipakai sekarang.
 */
export const generateReply = async (messages, systemPrompt) => {
   const { client, model } = getClient();

   try {
      const response = await client.models.generateContent({
         model,
         contents: toGeminiContents(messages),
         config: { systemInstruction: systemPrompt },
      });

      return {
         text: response.text ?? "",
         usage: response.usageMetadata ?? null,
      };
   } catch (err) {
      throw toAppError(err);
   }
};
