import { generateReply } from "./chat.provider.js";
import { buildSystemPrompt } from "./chat.prompt.js";
import { buildTools, findMentionedProducts } from "./chat.tools.js";
import AppError from "../../utils/appError.js";

// Pertanyaan wajar butuh 2-3 langkah (cari produk, lihat detail, menjawab).
// Lebih dari ini hampir pasti model berputar-putar, dan tiap langkah memakan
// token dari kuota yang sama.
const MAX_TOOL_STEPS = 5;

// Kuota gratis Groq 8000 token per menit, dan satu pertanyaan sudah memakai
// sekitar 3500 token tanpa riwayat. Riwayat di atas batas ini dibuang dari
// yang paling lama. 6000 karakter kira-kira 1700 token: cukup untuk beberapa
// giliran terakhir, yang memang paling relevan untuk menjawab.
const HISTORY_CHAR_BUDGET = 6000;

// Ditulis server, bukan model, jadi bahasanya harus dipilih sendiri
// mengikuti bahasa situs.
const FALLBACK_REPLY = {
   id: "Maaf, saya belum bisa menjawab pertanyaan ini. Silakan hubungi kami lewat tombol WhatsApp di situs, ya.",
   en: "Sorry, I can't answer this question yet. Please contact us using the WhatsApp button on the site.",
};

/**
 * Saklar fitur. Chat hanya menyala kalau CHAT_ENABLED bernilai persis
 * "true". Variabel yang lupa diisi di server berarti chat mati, bukan diam-diam
 * menyala dan menghabiskan kuota. Mengubahnya di Render cukup lewat
 * environment variable, tanpa mengubah kode.
 */
export const isChatEnabled = () => process.env.CHAT_ENABLED === "true";

// Pesan terakhir (pertanyaan yang sedang dijawab) selalu dipertahankan,
// walaupun sendirian sudah melebihi anggaran.
const trimHistory = (messages) => {
   const kept = [];
   let chars = 0;

   for (let i = messages.length - 1; i >= 0; i--) {
      chars += messages[i].text.length;
      if (kept.length > 0 && chars > HISTORY_CHAR_BUDGET) break;
      kept.unshift(messages[i]);
   }

   return kept;
};

/**
 * Menyusun balasan untuk satu giliran percakapan.
 *
 * Riwayat dikirim utuh oleh client tiap kali, karena server tidak menyimpan
 * percakapan. Bentuk dan panjangnya sudah dijaga chat.validation.js.
 *
 * `userId` hanya terisi kalau pengunjung login, dan menentukan apakah tool
 * pesanan ikut tersedia.
 *
 * `locale` adalah bahasa tampilan situs (id/en), dipakai kalau bahasa pesan
 * pembeli tidak jelas.
 *
 * `onDelta` dan `signal` hanya dipakai endpoint stream: yang pertama menerima
 * potongan teks, yang kedua menghentikan request ke penyedia saat pembeli
 * menutup koneksi.
 */
export const replyToChat = async (
   messages,
   userId,
   { locale, onDelta, signal } = {}
) => {
   if (!isChatEnabled()) {
      throw new AppError("Asisten belanja sedang tidak aktif.", 503);
   }

   const tools = buildTools({ userId });
   const history = trimHistory(messages);
   const startedAt = Date.now();
   const mentionedProducts = await findMentionedProducts(history.at(-1).text);

   const { text, totalTokens, steps } = await generateReply({
      messages: history,
      systemPrompt: buildSystemPrompt(locale, mentionedProducts),
      tools: tools.definitions,
      runTool: tools.run,
      maxSteps: MAX_TOOL_STEPS,
      onDelta,
      signal,
   });

   // Satu baris per pertanyaan, supaya pemakaian kuota bisa dibaca dari log
   // Render. Isi percakapan sengaja tidak dicatat: itu data pribadi pembeli.
   console.info(
      `[chat] steps=${steps} tokens=${totalTokens} ms=${Date.now() - startedAt} history=${history.length}/${messages.length} login=${Boolean(userId)} mentioned=${mentionedProducts.length}`
   );

   if (text) return { reply: text };

   // Pesan pengganti juga dikirim lewat stream, supaya pembeli tidak menatap
   // gelembung chat yang kosong.
   const fallback = FALLBACK_REPLY[locale] ?? FALLBACK_REPLY.id;
   onDelta?.(fallback);
   return { reply: fallback };
};
