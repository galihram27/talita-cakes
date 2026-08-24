/**
 * Memuat file .env ke process.env.
 *
 * WAJIB di-import PALING ATAS di server.js, sebelum modul lain. Banyak file
 * membaca process.env saat di-import (mis. lib/prisma.js langsung membuat
 * koneksi pakai DATABASE_URL) — kalau urutannya terbalik, nilainya masih
 * undefined saat dibaca.
 *
 * Path-nya dihitung dari lokasi file ini, bukan dari folder tempat perintah
 * dijalankan, supaya `npm run dev` tetap menemukan .env dari mana pun dipanggil.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });
