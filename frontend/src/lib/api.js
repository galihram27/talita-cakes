// src/lib/api.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Satu-satunya pintu ke backend. Semua service memakai ini, bukan memanggil
 * fetch/axios sendiri, supaya dua hal berikut berlaku di seluruh aplikasi:
 *
 * 1. Token dilampirkan otomatis ke setiap permintaan.
 * 2. Kalau token kedaluwarsa, ia diperbarui diam-diam lalu permintaannya
 *    diulang — pengunjung tidak merasakan apa-apa.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  // Wajib, supaya cookie berisi refresh token ikut terkirim
  withCredentials: true,
})

// Lampirkan token ke setiap permintaan yang keluar
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

/**
 * Penanganan token kedaluwarsa.
 *
 * Masalahnya: kalau halaman mengirim beberapa permintaan sekaligus dan
 * semuanya ditolak karena token basi, tanpa penjagaan mereka akan sama-sama
 * meminta token baru — token lama dicabut berkali-kali dan sebagian
 * permintaan tetap gagal.
 *
 * Karena itu hanya permintaan pertama yang benar-benar memperbarui token;
 * sisanya menunggu di antrean, lalu diulang bersama-sama memakai token baru.
 */
let isRefreshing = false
let refreshQueue = []

// Lepaskan semua yang mengantre: beri token baru, atau teruskan kegagalannya
const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    // Login & perpanjang token dikecualikan. Gagal login itu memang salah
    // sandi, bukan token basi — kalau ikut ditangani di sini, hasilnya
    // percobaan berulang tanpa ujung.
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh-token')

    // `_retry` menjaga satu permintaan hanya diulang sekali
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Sudah ada yang memperbarui token, tunggu giliran lalu ulangi
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await api.post('/auth/refresh-token')
        const newAccessToken = data.data.accessToken

        authStore.setAccessToken(newAccessToken)
        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Token perpanjangan pun tidak berlaku: sesinya memang sudah habis,
        // atau pengunjung ini belum pernah login sama sekali
        processQueue(refreshError, null)
        authStore.clearSession()

        /**
         * Antar ke halaman login, jangan biarkan pesan mentah dari server
         * muncul di layar. Alamat halaman sekarang dititipkan supaya setelah
         * login pengunjung kembali ke tempat semula — misalnya ia sedang
         * menambah barang ke keranjang.
         *
         * Router diambil lewat berkas penampung, bukan diimpor langsung,
         * supaya tidak terjadi impor melingkar (router memuat halaman, halaman
         * memakai berkas ini). Diimpor saat dibutuhkan karena router hanya ada
         * di peramban, tidak saat halaman dibangun.
         */
        const { getRouterInstance } = await import('@/router/holder')
        const router = getRouterInstance()
        if (router) {
          const current = router.currentRoute.value
          // Jangan mengantar ke login kalau sudah di sana
          if (current.name !== 'login') {
            router.push({ name: 'login', query: { redirect: current.fullPath } })
          }
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api