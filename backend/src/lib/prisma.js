import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Satu instance PrismaClient untuk seluruh aplikasi.
 *
 * Semua repository meng-import dari sini, bukan membuat client sendiri —
 * tiap PrismaClient membuka pool koneksinya sendiri, dan database gratisan
 * punya batas jumlah koneksi yang gampang habis.
 *
 * Prisma di sini tidak menghubungi DB sendiri, melainkan lewat driver `pg`
 * (adapter). Dengan begitu pengaturan pool ada di tangan kita.
 */
const pool = new pg.Pool({
   connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
