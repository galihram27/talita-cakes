import "dotenv/config"; // load .env sebelum apa pun lain dijalankan
import app from "./app.js";
import prisma from "./lib/prisma.js"; //? sesuaikan path kalau lokasi prisma client kamu berbeda

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown — pastikan koneksi prisma ditutup dengan benar
// saat server dimatikan (misal saat deploy ulang / container restart)
const shutdown = async (signal) => {
   console.log(`${signal} received. Shutting down gracefully...`);

   server.close(async () => {
      await prisma.$disconnect();
      console.log("Server closed, Prisma disconnected.");
      process.exit(0);
   });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Tangkap error yang gak ke-handle, biar gak silent crash di production
process.on("unhandledRejection", (reason) => {
   console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
   console.error("Uncaught Exception:", err);
   process.exit(1);
});