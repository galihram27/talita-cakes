// src/config/store.config.js

/**
 * Identitas toko yang dibaca dari environment variable.
 *
 * Ditaruh di .env, bukan ditulis langsung di kode, supaya koordinat & nomor
 * WhatsApp bisa diganti tanpa mengubah kode — dan supaya bisa berbeda antara
 * mesin lokal dan server produksi.
 */

// Titik asal perhitungan ongkir (lihat utils/distance.js)
export const STORE_LOCATION = {
   lat: Number(process.env.STORE_LATITUDE),
   lng: Number(process.env.STORE_LONGITUDE),
};

// Nomor tujuan pesanan. Format internasional TANPA "+", contoh: 6281234567890
// — itu bentuk yang diminta tautan wa.me (lihat utils/whatsapp.js).
export const OWNER_WHATSAPP_NUMBER = process.env.OWNER_WHATSAPP_NUMBER;
