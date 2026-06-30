// src/features/order/order.helper.js

export const MIN_DAYS_BEFORE_CAKE_DATE = 7;
export const DELIVERY_DISTANCE_UNIT_KM = 5;
export const DELIVERY_RATE_PER_UNIT = 10000; // Rp10.000 per 5km, sementara

/**
 * Validasi requestCakeDate minimal H+7 dari hari ini.
 * Dibandingkan per-tanggal (jam diabaikan), supaya user yang pesan
 * jam 23:59 H-7 tidak dirugikan dibanding yang pesan jam 00:01.
 */
export const isRequestCakeDateValid = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + MIN_DAYS_BEFORE_CAKE_DATE);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target.getTime() >= minDate.getTime();
};

/**
 * Hitung ongkir berdasarkan jarak (km).
 * Rumus sementara: Rp10.000 per kelipatan 5km, dibulatkan ke atas.
 * Contoh: 1km -> 10rb, 5km -> 10rb, 5.1km -> 20rb, 12km -> 30rb.
 * GANTI logic ini kalau owner sudah punya rumus ongkir final.
 */
export const calculateDeliveryFee = (distanceKm) => {
  if (!distanceKm || distanceKm <= 0) return 0;

  const units = Math.ceil(distanceKm / DELIVERY_DISTANCE_UNIT_KM);
  return units * DELIVERY_RATE_PER_UNIT;
};