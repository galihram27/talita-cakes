import { replyToChat, isChatEnabled } from "./chat.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

// GET /chat/status  (public)
// Dipakai widget untuk memutuskan perlu tampil atau tidak.
export const chatStatusController = (req, res) =>
   res.status(200).json({ data: { enabled: isChatEnabled() } });

// POST /chat  (public, login opsional)
export const chatController = asyncHandler(async (req, res) => {
   const result = await replyToChat(req.body.messages, req.user?.userId);

   return res.status(200).json({
      message: "Chat reply generated successfully",
      data: result,
   });
});

const SSE_HEADERS = {
   "Content-Type": "text/event-stream",
   "Cache-Control": "no-cache",
   Connection: "keep-alive",
   // Proxy seperti nginx menahan response sampai selesai kalau header ini
   // tidak ada, dan streaming jadi tidak terasa sama sekali.
   "X-Accel-Buffering": "no",
};

/**
 * POST /chat/stream  (public, login opsional)
 *
 * Mengirim jawaban sebagai Server-Sent Events:
 *   event: delta  data: { "text": "..." }   potongan jawaban, berulang
 *   event: done   data: {}                  jawaban selesai
 *   event: error  data: { "message": "..." } gagal di tengah jalan
 *
 * Header stream baru dikirim saat potongan pertama siap. Selama belum ada
 * yang terkirim, kegagalan (kuota habis, penyedia sibuk, dst.) tetap dibalas
 * errorHandler sebagai JSON dengan status HTTP yang benar.
 *
 * Satu-satunya controller dengan try/catch. Setelah header stream terkirim,
 * errorHandler tidak bisa lagi membalas, jadi kegagalan harus dikirim
 * sebagai event dari sini.
 */
export const chatStreamController = asyncHandler(async (req, res) => {
   // Pembeli menutup widget atau pindah halaman: hentikan request ke
   // penyedia supaya token tidak terus terpakai untuk jawaban yang tidak
   // akan dibaca siapa pun.
   const abort = new AbortController();
   res.on("close", () => {
      if (!res.writableEnded) abort.abort();
   });

   const send = (event, data) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
   const startStream = () => {
      if (!res.headersSent) res.writeHead(200, SSE_HEADERS);
   };

   try {
      await replyToChat(req.body.messages, req.user?.userId, {
         signal: abort.signal,
         onDelta: (text) => {
            startStream();
            send("delta", { text });
         },
      });
      startStream();
      send("done", {});
   } catch (err) {
      if (!res.headersSent) throw err;
      if (abort.signal.aborted) return;

      if (!err.isOperational) console.error(err);
      send("error", {
         message: err.isOperational
            ? err.message
            : "Asisten sedang tidak bisa menjawab.",
      });
   }

   res.end();
});
