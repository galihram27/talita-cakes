// src/stores/cart.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'

/**
 * Salinan isi keranjang di sisi peramban.
 *
 * Gunanya dua: angka di ikon keranjang navbar selalu ikut berubah, dan
 * halaman Keranjang serta Checkout bisa langsung menampilkan isinya —
 * tidak perlu tulisan "memuat..." tiap kali dibuka.
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    // Jumlah seluruh barang, bukan jumlah baris. Dua kue yang sama
    // terhitung 2, bukan 1.
    count: 0,
    items: [],
    subtotal: 0,
    // Menandai isi keranjang sudah pernah diambil dari server, walau hasilnya
    // kosong. Halaman memakainya untuk memutuskan perlu menampilkan
    // tulisan "memuat..." atau tidak.
    loaded: false,
    isMiniOpen: false, // ringkasan keranjang di navbar sedang terbuka?
  }),

  actions: {
    // Simpan daftar barang lalu hitung ulang jumlah & subtotalnya.
    // Dipakai halaman Keranjang setelah menambah, mengurangi, atau menghapus
    // barang — jadi tidak perlu bertanya ulang ke server.
    setFromItems(items) {
      this.items = items || []
      this.count = this.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
      this.subtotal = this.items.reduce((sum, i) => sum + (i.lineTotal || 0), 0)
      this.loaded = true
    },

    // Ambil ulang isi keranjang dari server.
    // Pengunjung yang belum login tidak punya keranjang, jadi langsung
    // dikosongkan tanpa repot bertanya ke server.
    async refresh() {
      // Diambil saat dibutuhkan, bukan diimpor di atas: store auth juga
      // memakai store ini, jadi impornya akan melingkar
      const auth = (await import('@/stores/auth.store')).useAuthStore()
      if (!auth.isAuthenticated) {
        this.setFromItems([])
        return
      }
      try {
        const { data } = await api.get('/carts')
        this.setFromItems(data.data?.items)
      } catch {
        // Gagal mengambil: biarkan isi yang lama tetap tampil. Lebih baik
        // menampilkan data agak lama daripada tiba-tiba jadi kosong.
      }
    },

    openMini() {
      this.isMiniOpen = true
    },

    closeMini() {
      this.isMiniOpen = false
    },

    toggleMini() {
      this.isMiniOpen = !this.isMiniOpen
    },

    // Kosongkan semuanya. Dipanggil saat pengguna keluar, supaya keranjang
    // orang sebelumnya tidak terlihat oleh yang login berikutnya.
    reset() {
      this.count = 0
      this.items = []
      this.subtotal = 0
      this.loaded = false
      this.isMiniOpen = false
    },
  },
})
