import express from "express";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from './utils/appError.js';
import { visitorTrackingMiddleware } from "./middlewares/visitorTracking.middleware.js";

const app = express();

app.use(express.json());
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