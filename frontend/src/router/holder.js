/**
 * Penampung router aplikasi.
 *
 * Router-nya dibuat di main.js, lalu dititipkan ke sini supaya bisa dipakai
 * kode yang bukan komponen — misalnya lib/api.js saat perlu mengantar
 * pengunjung ke halaman login.
 *
 * Cara ini dipakai karena membuat router baru di tempat lain akan menghasilkan
 * router yang berbeda dari yang sedang dipakai aplikasi, sehingga perpindahan
 * halamannya tidak terjadi apa-apa.
 */
let _router = null

export const setRouterInstance = (router) => {
  _router = router
}

export const getRouterInstance = () => _router
