// src/features/order/order.helper.js

/**
 * Aturan bisnis toko yang berupa angka & rumus sederhana.
 * Dipisah ke file sendiri supaya bisa dipakai bersama oleh order.validation.js
 * dan order.service.js, dan supaya angkanya gampang dicari saat mau diubah.
 */

// Jeda minimal antara hari pemesanan dan tanggal kue diambil/dikirim
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
 * Hitung ongkir berdasarkan radius jarak (km) dari toko. Tarif dari toko:
 *   < 2 km    -> Rp35.000
 *   3–5 km    -> Rp45.000
 *   6–10 km   -> Rp55.000
 *   11–15 km  -> Rp65.000
 *   16–20 km  -> Rp75.000
 *   21–25 km  -> Rp85.000
 *   > 25 km   -> null (di luar jangkauan, hubungi toko)
 *
 * Tabel toko ditulis dengan angka bulat, sedangkan jarak dari peta berupa
 * pecahan. Batas atas tiap tarif ikut tarif itu, dan jarak di celah antar
 * baris (mis. 2,4 km atau 5,5 km) masuk tarif berikutnya.
 *
 * Salinannya untuk ditampilkan ada di frontend/src/config/constants.js
 * (DELIVERY_FEE_TIERS & deliveryTierIndex); keselarasannya diperiksa
 * constants.test.js di frontend.
 */
export const calculateDeliveryFee = (distanceKm) => {
   if (!distanceKm || distanceKm <= 0) return 0;
   if (distanceKm > MAX_DELIVERY_DISTANCE_KM) return null;

   if (distanceKm < 2) return 35000;
   if (distanceKm <= 5) return 45000;
   if (distanceKm <= 10) return 55000;
   if (distanceKm <= 15) return 65000;
   if (distanceKm <= 20) return 75000;
   return 85000;
};
