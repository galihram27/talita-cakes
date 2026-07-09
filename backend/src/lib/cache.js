// src/lib/cache.js
//
// Cache in-memory sederhana dengan TTL, untuk data publik yang sering dibaca
// tapi jarang berubah (produk, gallery). Tujuannya menekan jumlah query ke DB
// -> menghemat egress/kuota.
//
// CATATAN:
// - Hanya untuk data PUBLIK yang sama untuk semua orang. JANGAN dipakai untuk
//   data per-user (cart, order, profil) atau data soal uang/stok real-time.
// - Cache ini per-instance & hilang saat server restart. Untuk skala saat ini
//   sudah cukup; kalau nanti multi-instance, pertimbangkan Redis.

const store = new Map(); // key -> { value, expiresAt }

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 menit

/**
 * Ambil value dari cache. Return undefined kalau tidak ada / sudah kedaluwarsa.
 * (kita tidak pernah menyimpan undefined, jadi undefined = cache miss.)
 */
export const cacheGet = (key) => {
   const hit = store.get(key);
   if (!hit) return undefined;

   if (hit.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
   }

   return hit.value;
};

/**
 * Simpan value ke cache dengan masa berlaku (default 5 menit).
 */
export const cacheSet = (key, value, ttlMs = DEFAULT_TTL_MS) => {
   store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

/**
 * Hapus semua entry yang key-nya diawali prefix tertentu.
 * Dipakai untuk invalidasi per-namespace, mis. cacheDeleteByPrefix("product:")
 * saat admin menambah/mengubah/menghapus produk.
 */
export const cacheDeleteByPrefix = (prefix) => {
   for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
   }
};

/**
 * Helper get-or-load: kembalikan dari cache kalau ada, kalau tidak jalankan
 * loader() (query DB), simpan hasilnya, lalu kembalikan.
 */
export const cached = async (key, loader, ttlMs = DEFAULT_TTL_MS) => {
   const hit = cacheGet(key);
   if (hit !== undefined) return hit;

   const value = await loader();
   cacheSet(key, value, ttlMs);
   return value;
};
