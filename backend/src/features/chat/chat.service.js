import { generateReply } from "./chat.provider.js";
import { SYSTEM_PROMPT } from "./chat.prompt.js";
import { buildTools } from "./chat.tools.js";

// Pertanyaan wajar butuh 2-3 langkah (cari produk, lihat detail, menjawab).
// Lebih dari ini hampir pasti model berputar-putar, dan tiap langkah memakan
// satu request dari kuota harian.
const MAX_TOOL_STEPS = 5;

const FALLBACK_REPLY =
   "Maaf, saya belum bisa menjawab pertanyaan ini. Silakan hubungi kami lewat tombol WhatsApp di situs, ya.";

/**
 * Menyusun balasan untuk satu giliran percakapan.
 *
 * Riwayat dikirim utuh oleh client tiap kali, karena server tidak menyimpan
 * percakapan. Batas panjang & jumlahnya sudah dijaga chat.validation.js.
 *
 * `userId` hanya terisi kalau pengunjung login, dan menentukan apakah tool
 * pesanan ikut tersedia.
 *
 * `onDelta` dan `signal` hanya dipakai endpoint stream: yang pertama menerima
 * potongan teks, yang kedua menghentikan request ke penyedia saat pembeli
 * menutup koneksi.
 */
export const replyToChat = async (
   messages,
   userId,
   { onDelta, signal } = {}
) => {
   const tools = buildTools({ userId });

   const { text } = await generateReply({
      messages,
      systemPrompt: SYSTEM_PROMPT,
      tools: tools.definitions,
      runTool: tools.run,
      maxSteps: MAX_TOOL_STEPS,
      onDelta,
      signal,
   });

   if (text) return { reply: text };

   // Pesan pengganti juga dikirim lewat stream, supaya pembeli tidak menatap
   // gelembung chat yang kosong.
   onDelta?.(FALLBACK_REPLY);
   return { reply: FALLBACK_REPLY };
};
