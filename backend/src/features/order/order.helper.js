// src/features/order/order.helper.js

export const MIN_DAYS_BEFORE_CAKE_DATE = 3;

// Batas maksimal radius pengiriman. Di luar ini user diarahkan
// menghubungi toko langsung untuk info biaya pengiriman.
export const MAX_DELIVERY_DISTANCE_KM = 25;

/**
 * Validasi requestCakeDate minimal H+3 dari hari ini.
 * Dibandingkan per-tanggal (jam diabaikan), supaya user yang pesan
 * jam 23:59 H-3 tidak dirugikan dibanding yang pesan jam 00:01.
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
 * Hitung ongkir berdasarkan radius jarak (km) dari toko:
 *   < 5 km    -> Rp30.000
 *   5–10 km   -> Rp45.000
 *   11–15 km  -> Rp55.000
 *   16–20 km  -> Rp65.000
 *   21–25 km  -> Rp75.000
 *   > 25 km   -> null (di luar jangkauan, hubungi toko)
 */
export const calculateDeliveryFee = (distanceKm) => {
  if (!distanceKm || distanceKm <= 0) return 0;
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) return null;

  if (distanceKm < 5) return 30000;
  if (distanceKm <= 10) return 45000;
  if (distanceKm <= 15) return 55000;
  if (distanceKm <= 20) return 65000;
  return 75000;
};