import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from './utils/appError.js';
import { visitorTrackingMiddleware } from "./middlewares/visitorTracking.middleware.js";

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

// limit dinaikkan supaya upload gambar produk (base64 data URL) muat,
// karena belum ada endpoint upload file terpisah
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(visitorTrackingMiddleware);

// semua route fitur masuk lewat sini, dengan prefix /api
app.use("/api", routes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} tidak ditemukan`, 404));
});

// error handler harus paling bawah, setelah semua route
app.use(errorHandler);

export default app;