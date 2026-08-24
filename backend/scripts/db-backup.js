// scripts/db-backup.js
//
// Menyalin seluruh isi database Neon ke berkas lokal di folder backend/backups/.
// Setiap kali dijalankan menghasilkan dua berkas dengan stempel waktu:
//
//   talita_cakes-YYYYMMDD-HHmmss.dump  format custom  → restore pakai pg_restore
//   talita_cakes-YYYYMMDD-HHmmss.sql   SQL polos      → bisa dibaca/diedit manual
//
// Folder backups/ sudah masuk .gitignore karena isinya data asli pengguna
// (email, nomor HP, alamat pengiriman).
//
// Cara pakai:  npm run db:backup            (dari folder backend)
//              npm run db:backup -- --keep=30   simpan 30 backup terakhir
//
// Backup lama otomatis dihapus, secara bawaan hanya 10 terbaru yang disimpan.
// Butuh pg_dump versi 18 ke atas terpasang (server Neon-nya PostgreSQL 18).

import "../src/config/env.js";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, "../backups");

const arg = (name, fallback) => {
   const found = process.argv.find((a) => a.startsWith(`--${name}=`));
   return found ? found.split("=")[1] : fallback;
};

/**
 * Neon punya dua alamat: yang ber-"-pooler" (lewat pgbouncer) dan yang langsung.
 * pg_dump harus lewat yang langsung — pgbouncer mode transaksi tidak mendukung
 * perintah tingkat sesi yang dipakai pg_dump, dumpnya bisa gagal di tengah.
 */
const toDirectUrl = (url) => url.replace("-pooler", "");

/**
 * Cari pg_dump: utamakan PG_DUMP_PATH dari .env, lalu PATH, lalu lokasi
 * pemasangan bawaan PostgreSQL di Windows (versi tertinggi dulu).
 */
const findPgDump = () => {
   const fromEnv = process.env.PG_DUMP_PATH;
   if (fromEnv) {
      if (!fs.existsSync(fromEnv)) {
         throw new Error(`PG_DUMP_PATH menunjuk ke berkas yang tidak ada: ${fromEnv}`);
      }
      return fromEnv;
   }

   if (spawnSync("pg_dump", ["--version"]).status === 0) return "pg_dump";

   const roots = ["C:/Program Files/PostgreSQL", "D:/PostgreSQL"];
   const candidates = roots
      .filter((root) => fs.existsSync(root))
      .flatMap((root) =>
         fs
            .readdirSync(root)
            .map((version) => ({ version: Number(version), root }))
            .filter(({ version }) => Number.isFinite(version))
      )
      .sort((a, b) => b.version - a.version)
      .map(({ root, version }) => path.join(root, String(version), "bin/pg_dump.exe"))
      .filter((p) => fs.existsSync(p));

   if (candidates.length === 0) {
      throw new Error(
         "pg_dump tidak ditemukan. Pasang PostgreSQL client tools, atau " +
            "isi PG_DUMP_PATH di .env dengan path lengkap ke pg_dump."
      );
   }
   return candidates[0];
};

const stamp = () => {
   const p = (n) => String(n).padStart(2, "0");
   const d = new Date();
   return (
      `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
      `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
   );
};

const dump = (pgDump, url, outFile, format) => {
   const result = spawnSync(pgDump, [url, `-F${format}`, "-f", outFile], {
      stdio: ["ignore", "inherit", "inherit"],
   });
   if (result.error) throw result.error;
   if (result.status !== 0) {
      throw new Error(`pg_dump gagal (exit code ${result.status}) untuk ${outFile}`);
   }
};

/** Sisakan hanya `keep` backup terbaru; sisanya dihapus. */
const pruneOld = (keep) => {
   const stamps = [
      ...new Set(
         fs
            .readdirSync(BACKUP_DIR)
            .map((f) => f.match(/^talita_cakes-(\d{8}-\d{6})\.(dump|sql)$/)?.[1])
            .filter(Boolean)
      ),
   ].sort();

   for (const old of stamps.slice(0, Math.max(0, stamps.length - keep))) {
      for (const ext of ["dump", "sql"]) {
         const file = path.join(BACKUP_DIR, `talita_cakes-${old}.${ext}`);
         if (fs.existsSync(file)) fs.unlinkSync(file);
      }
      console.log(`  dihapus (backup lama): talita_cakes-${old}.*`);
   }
};

const main = () => {
   const rawUrl = process.env.DATABASE_URL;
   if (!rawUrl) throw new Error("DATABASE_URL belum diisi di .env");

   const keep = Number(arg("keep", 10));
   if (!Number.isInteger(keep) || keep < 1) {
      throw new Error("--keep harus bilangan bulat minimal 1");
   }

   const pgDump = findPgDump();
   fs.mkdirSync(BACKUP_DIR, { recursive: true });

   const url = toDirectUrl(rawUrl);
   const ts = stamp();
   const base = path.join(BACKUP_DIR, `talita_cakes-${ts}`);

   console.log(`Backup database → ${BACKUP_DIR}`);
   dump(pgDump, url, `${base}.dump`, "c");
   dump(pgDump, url, `${base}.sql`, "p");

   for (const ext of ["dump", "sql"]) {
      const { size } = fs.statSync(`${base}.${ext}`);
      console.log(`  ✔ talita_cakes-${ts}.${ext}  (${Math.round(size / 1024)} KB)`);
   }

   pruneOld(keep);
   console.log("Backup selesai.");
};

try {
   main();
} catch (err) {
   console.error("Backup gagal:", err.message);
   process.exitCode = 1;
}
