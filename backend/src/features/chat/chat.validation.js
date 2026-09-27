import { z } from "zod";

/**
 * Validasi body POST /chat.
 *
 * Kedua batas di bawah bukan sekadar kerapian. Seluruh riwayat dikirim ulang
 * ke Gemini tiap giliran, jadi riwayat atau pesan yang tidak dibatasi berarti
 * pemakaian token (dan kuota) yang juga tidak terbatas.
 */
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 20;

const messageSchema = z.object({
   role: z.enum(["user", "assistant"]),
   text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const chatSchema = z.object({
   messages: z
      .array(messageSchema)
      .min(1)
      .max(MAX_HISTORY)
      // Yang dijawab selalu pesan terakhir, jadi harus berasal dari pembeli.
      .refine((messages) => messages.at(-1)?.role === "user", {
         message: "Pesan terakhir harus dari user",
      }),
});
