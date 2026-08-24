// src/lib/visitor.js
const STORAGE_KEY = 'talita_visitor_id'
const SESSION_KEY = 'talita_visit_reported'

/**
 * Penanda pengunjung, untuk menghitung jumlah pengunjung situs.
 *
 * Disimpan di penyimpanan milik situs ini sendiri, bukan lewat cookie dari
 * server. Alasannya: frontend dan backend berada di domain berbeda, sehingga
 * cookie dari server terhitung "cookie pihak ketiga" yang diblokir Safari,
 * Brave, Firefox, dan mode penyamaran. Penyimpanan sendiri tidak kena blokir.
 *
 * Keuntungan lain: penandanya tidak ikut berubah saat pengunjung berganti
 * jaringan — dari WiFi ke seluler, misalnya — jadi orang yang sama tidak
 * terhitung dua kali.
 *
 * Mengembalikan null kalau penyimpanan tidak bisa dipakai. Dalam keadaan itu
 * server memakai cara cadangannya sendiri.
 */
export const getVisitorId = () => {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/**
 * Penanda bahwa kunjungan kali ini sudah dilaporkan ke server, supaya
 * berpindah-pindah halaman dalam satu tab tidak terhitung berkali-kali.
 *
 * Berbeda dengan penanda pengunjung di atas, yang ini disimpan per tab dan
 * hilang sendiri saat tab ditutup — jadi kunjungan berikutnya terhitung lagi.
 */
export const hasReportedThisSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export const markReportedThisSession = () => {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Penyimpanan diblokir. Akibatnya kunjungan dilaporkan sekali tiap
    // halaman dimuat, bukan sekali per kunjungan — masih bisa diterima.
  }
}
