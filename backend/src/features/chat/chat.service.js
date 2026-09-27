import { generateReply } from "./chat.provider.js";
import { SYSTEM_PROMPT } from "./chat.prompt.js";

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
