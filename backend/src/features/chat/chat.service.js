import { generateReply } from "./chat.provider.js";

// Sementara. Diganti prompt lengkap berisi konteks toko di chat.prompt.js
// (Tahap 2 RENCANA-CHATBOT.md).
const SYSTEM_PROMPT =
   "Kamu adalah asisten belanja toko kue Talita's Cake. Jawab singkat dan ramah, dalam bahasa yang dipakai pembeli.";

/**
 * Menyusun balasan untuk satu giliran percakapan.
 *
 * Riwayat dikirim utuh oleh client tiap kali, karena server tidak menyimpan
 * percakapan. Batas panjang & jumlahnya sudah dijaga chat.validation.js.
 */
export const replyToChat = async (messages) => {
   const { text } = await generateReply(messages, SYSTEM_PROMPT);

   return { reply: text };
};
