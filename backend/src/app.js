import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./utils/appError.js";

/**
 * Perakitan aplikasi Express: middleware, route, lalu penangan error.
 *
 * URUTAN PEMASANGAN BERPENGARUH — Express menjalankan middleware sesuai urutan
 * pendaftarannya. Karena itu susunannya: pembaca request dulu (cors, json,
 * cookie), baru route, lalu 404, dan error handler paling akhir.
 *
 * File ini sengaja tidak memanggil app.listen(). Menyalakan server adalah
 * tugas server.js, sehingga `app` di sini bisa diimpor untuk keperluan lain
 * (mis. pengujian) tanpa ikut membuka port.
 */
const app = express();

// di production backend jalan di belakang proxy (Render), tanpa ini req.ip
// berisi IP proxy, bukan IP pengunjung
app.set("trust proxy", 1);

app.use(
   cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173", // sesuaikan port Vite kamu
      credentials: true, // wajib, karena api.js pakai withCredentials: true
   })
);

// Limit 10mb ini warisan dari masa gambar produk dikirim sebagai base64 di
// dalam JSON. Sekarang gambar diunggah lewat /api/uploads ke Cloudinary dan
// yang disimpan hanya URL-nya, jadi body JSON sebenarnya sudah jauh lebih
// kecil. Angkanya dibiarkan sebagai kelonggaran untuk produk dengan banyak
// varian & foto.
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Catatan: tracking pengunjung TIDAK dipasang sebagai middleware global.
// Dulu begitu, dan akibatnya setiap request ke /api/* ikut terhitung —
// termasuk scanner/bot yang menembak URL backend langsung. Sekarang hanya
// frontend yang melapor sekali per sesi lewat POST /api/analytics/visit.

// semua route fitur masuk lewat sini, dengan prefix /api
app.use("/api", routes);

// 404 handler — dipasang setelah semua route, jadi hanya tercapai kalau tidak
// ada route yang cocok. Dilempar sebagai AppError supaya bentuk response-nya
// sama dengan error lain, bukan HTML bawaan Express.
app.use((req, res, next) => {
   next(new AppError(`Route ${req.originalUrl} tidak ditemukan`, 404));
});

// error handler harus paling bawah, setelah semua route
app.use(errorHandler);

export default app;
