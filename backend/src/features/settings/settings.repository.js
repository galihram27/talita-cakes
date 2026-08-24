import prisma from "../../lib/prisma.js";

/**
 * Query untuk tabel site_settings.
 *
 * Tabelnya sederhana: satu baris = satu pasangan key–value, dipakai menyimpan
 * konten homepage yang boleh diganti admin tanpa deploy ulang (mis. hero-image).
 */

// Ambil 1 setting by key
export const findSetting = (key) =>
   prisma.siteSetting.findUnique({ where: { key } });

// Buat / perbarui setting (upsert by key)
export const upsertSetting = (key, value) =>
   prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
   });
