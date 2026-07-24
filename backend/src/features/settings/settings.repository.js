import prisma from "../../lib/prisma.js";

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
