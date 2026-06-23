import express from "express";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js"; //? sesuaikan kalau nama file error handler kamu berbeda

const app = express();

app.use(express.json());
app.use(cookieParser());

// semua route fitur masuk lewat sini, dengan prefix /api
app.use("/api", routes);

// error handler harus paling bawah, setelah semua route
app.use(errorHandler);

export default app;