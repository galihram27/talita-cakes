import { z } from "zod";

/**
 * Validasi body POST /chat dan /chat/stream.
 *
 * Seluruh riwayat dikirim ulang ke penyedia model tiap giliran, jadi batas di
 * sini sekaligus batas pemakaian token. Riwayat yang lolos validasi masih
 * dipangkas lagi oleh chat.service.js supaya muat di kuota per menit.
 *
 * Pesan pembeli dan jawaban asisten dibatasi berbeda. Pembeli mengetik
 * sendiri, jadi 1000 karakter sudah longgar. Jawaban asisten ditulis model
 * dan bisa jauh lebih panjang (penjelasan cara memesan sekitar 1900
 * karakter); kalau batasnya disamakan, widget yang mengirim balik jawaban itu
 * sebagai riwayat akan ditolak.
 */
const MAX_USER_MESSAGE_LENGTH = 1000;
const MAX_ASSISTANT_MESSAGE_LENGTH = 4000;
const MAX_HISTORY = 20;

const messageSchema = z.discriminatedUnion("role", [
   z.object({
      role: z.literal("user"),
      text: z.string().trim().min(1).max(MAX_USER_MESSAGE_LENGTH),
   }),
   z.object({
      role: z.literal("assistant"),
      text: z.string().trim().min(1).max(MAX_ASSISTANT_MESSAGE_LENGTH),
   }),
]);

export const chatSchema = z.object({
   messages: z
      .array(messageSchema)
      .min(1)
      .max(MAX_HISTORY)
      // Yang dijawab selalu pesan terakhir, jadi harus berasal dari pembeli.
      .refine((messages) => messages.at(-1)?.role === "user", {
         message: "Pesan terakhir harus dari user",
      }),
   // Bahasa tampilan situs. Opsional supaya uji dengan curl tetap mudah.
   locale: z.enum(["id", "en"]).optional(),
});
