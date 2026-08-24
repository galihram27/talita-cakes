// src/stores/auth.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'

/**
 * Keadaan login pengguna, dipakai seluruh aplikasi.
 *
 * Ada dua macam token, dan pembagiannya disengaja:
 * - Access token disimpan di memori saja. Sengaja TIDAK ditaruh di
 *   penyimpanan peramban — kalau ada celah keamanan di halaman, isi
 *   penyimpanan bisa dibaca skrip jahat, sedangkan memori tidak.
 * - Refresh token tidak pernah disentuh berkas ini sama sekali. Ia ada di
 *   cookie khusus yang tidak bisa dibaca JavaScript, dan peramban yang
 *   mengirimkannya sendiri ke server.
 *
 * Akibat dari pilihan itu: memuat ulang halaman menghapus access token dari
 * memori. Karena itu ada restoreSession(), yang menukar cookie tadi dengan
 * access token baru supaya pengguna tidak perlu login lagi.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null,
    user: null, // { id, name, email, role }
    // Menandai pemulihan sesi sudah selesai. Penjaga halaman menunggu ini
    // sebelum memutuskan seseorang boleh masuk atau tidak.
    isReady: false,
    // Penjaga supaya pemulihan sesi tidak berjalan dua kali bersamaan
    _restorePromise: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },

  actions: {
    setAccessToken(token) {
      this.accessToken = token
    },

    setUser(user) {
      this.user = user
    },

    clearSession() {
      this.accessToken = null
      this.user = null
    },

    // Dipakai setelah login berhasil maupun setelah verifikasi email berhasil
    handleAuthSuccess({ accessToken, user }) {
      this.accessToken = accessToken
      this.user = user
    },

    // Pendaftaran belum membuat sesi login. Server hanya mengirim kode ke
    // email; login baru terjadi setelah kode itu diverifikasi.
    async register(payload) {
      const { data } = await api.post('/auth/register', payload)
      return data
    },

    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials)
      this.handleAuthSuccess(data.data)
      return data
    },

    /**
     * Keluar. Pembersihan diletakkan di `finally` supaya tetap berjalan
     * walau permintaan ke server gagal — dari sisi pengguna, menekan tombol
     * keluar harus selalu berhasil.
     */
    async logout() {
      try {
        await api.post('/auth/logout')
      } finally {
        this.clearSession()

        // Kedua store di bawah diambil saat dibutuhkan, bukan diimpor di atas,
        // karena keduanya juga memakai store ini — impornya akan melingkar.
        const { useCartStore } = await import('@/stores/cart.store')
        useCartStore().reset()

        // Daftar pesanan tersimpan di penyimpanan peramban dan berisi data
        // pembeli, jadi harus ikut dibuang saat keluar
        const { useAdminOrdersStore } = await import('@/stores/adminOrders.store')
        useAdminOrdersStore().invalidate()
      }
    },

    /**
     * Pulihkan sesi dari cookie, dipanggil sekali saat aplikasi dibuka.
     *
     * Kalau sudah pernah atau sedang berjalan, pemanggil berikutnya menunggu
     * proses yang sama — bukan memulai yang baru. Ini penting karena
     * pemanggilnya bisa lebih dari satu tempat sekaligus.
     */
    async restoreSession() {
      if (this._restorePromise) return this._restorePromise
      this._restorePromise = this._doRestoreSession()
      return this._restorePromise
    },

    async _doRestoreSession() {
      try {
        // Tukar cookie dengan access token baru...
        const { data: refreshData } = await api.post('/auth/refresh-token')
        this.accessToken = refreshData.data.accessToken

        // ...lalu pakai token itu untuk mengambil data penggunanya
        const { data: meData } = await api.get('/auth/me')
        this.user = meData.data.user
      } catch (err) {
        // Gagal itu hal biasa: bisa jadi memang belum pernah login, atau
        // sesinya sudah kedaluwarsa. Bukan sesuatu yang perlu dilaporkan.
        this.clearSession()
      } finally {
        // Selalu ditandai selesai, berhasil maupun tidak — kalau tidak,
        // penjaga halaman akan menunggu selamanya.
        this.isReady = true
      }
    },
  },
})
