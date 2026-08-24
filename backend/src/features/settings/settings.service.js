import AppError from "../../utils/appError.js";
import { findSetting, upsertSetting } from "./settings.repository.js";
import { cached, cacheDeleteByPrefix } from "../../lib/cache.js";
import { triggerRebuild } from "../../utils/deployHook.js";

/**
 * Aturan bisnis pengaturan situs.
 *
 * Dua hal penting yang diurus di sini:
 * 1. Key yang boleh dipakai dibatasi whitelist, jadi endpoint ini tidak bisa
 *    dipakai membuat setting sembarangan.
 * 2. Hasil baca di-cache, dan setiap kali nilainya diubah cache dibuang lalu
 *    build ulang frontend dipicu — karena nilainya ikut ter-render ke halaman
 *    statis, bukan diambil saat halaman dibuka.
 */

const SETTINGS_CACHE_PREFIX = "setting:";

// Whitelist key yang boleh dibaca/diubah lewat API. Mencegah pembuatan
// setting sembarang. Tambahkan key baru di sini saat memperluas konten
// homepage yang bisa diatur admin.
export const ALLOWED_SETTING_KEYS = ["hero-image"];

export const isAllowedKey = (key) => ALLOWED_SETTING_KEYS.includes(key);

// GET (public) — nilai atau null bila belum diset.
export const getSetting = async (key) => {
   return cached(`${SETTINGS_CACHE_PREFIX}${key}`, async () => {
      const setting = await findSetting(key);
      return setting?.value ?? null;
   });
};

// PUT (admin) — simpan nilai, invalidasi cache, picu rebuild situs statis
// karena konten ini dipakai di halaman yang di-prerender (home).
export const setSetting = async (key, value) => {
   if (!isAllowedKey(key)) {
      throw new AppError("Pengaturan tidak dikenal", 404);
   }
   if (typeof value !== "string" || value.trim() === "") {
      throw new AppError("Nilai pengaturan wajib diisi", 400);
   }

   const setting = await upsertSetting(key, value.trim());
   cacheDeleteByPrefix(`${SETTINGS_CACHE_PREFIX}${key}`);
   triggerRebuild(`setting ${key} changed`);
   return setting;
};
