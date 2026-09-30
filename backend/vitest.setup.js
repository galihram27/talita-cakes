import { vi } from "vitest";

// Semua test adalah unit test tanpa basis data. Prisma ditiru di sini untuk
// seluruh test sekaligus: kalau ada test yang lupa meniru repository, test itu
// langsung gagal dengan pesan jelas, bukan diam-diam tersambung ke basis data
// dari .env (yang bisa saja basis data produksi).
vi.mock("./src/lib/prisma.js", () => {
   const refuse = (path) =>
      new Proxy(() => {}, {
         get(_, key) {
            // `then` dibaca saat modul di-await; symbol dibaca oleh inspeksi
            // bawaan Node. Keduanya bukan pemanggilan ke basis data.
            if (key === "then" || typeof key === "symbol") return undefined;
            return refuse(`${path}.${key}`);
         },
         apply() {
            throw new Error(
               `test tidak boleh menyentuh basis data (memanggil ${path})`
            );
         },
      });

   return { default: refuse("prisma") };
});
