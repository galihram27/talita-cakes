// src/lib/visitor.js
const STORAGE_KEY = 'talita_visitor_id'
const SESSION_KEY = 'talita_visit_reported'

/**
 * ID pengunjung first-party.
 *
 * Sengaja di localStorage, bukan cookie dari backend: frontend (Vercel) dan
 * backend (Render) beda domain, jadi cookie backend adalah cookie pihak ketiga
 * yang diblokir Safari/Brave/Firefox dan mode incognito. localStorage milik
 * domain frontend sendiri, jadi selamat — dan tidak ikut berubah saat IP
 * pengunjung berganti (ganti WiFi <-> seluler, CGNAT operator).
 *
 * Mengembalikan null kalau storage tidak bisa dipakai (incognito ketat /
 * storage penuh); backend akan jatuh ke fingerprint sebagai cadangan.
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
 * Penanda "kunjungan sesi ini sudah dilaporkan", supaya pindah-pindah halaman
 * dalam satu tab tidak menembak backend berkali-kali. sessionStorage, jadi
 * otomatis hilang saat tab ditutup.
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
    // storage diblokir -> paling banter melapor sekali per page load, tidak apa
  }
}
