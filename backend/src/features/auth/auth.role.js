/**
 * Daftar role yang dikenal aplikasi.
 *
 * Dipakai sebagai satu-satunya sumber kebenaran soal role, supaya di kode lain
 * tidak ada string "USER"/"ADMIN" yang diketik manual (rawan typo).
 * Nilainya harus sama persis dengan enum `Role` di prisma/schema.prisma.
 */
export const ROLE = {
   USER: "USER",
   ADMIN: "ADMIN",
};
