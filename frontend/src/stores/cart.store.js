// src/stores/cart.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'

// Menyimpan isi keranjang (item + subtotal) sebagai cache supaya:
// - badge count di Navbar selalu sinkron
// - halaman Cart & Checkout bisa tampil instan dari cache lalu refresh diam-diam,
//   tanpa spinner "Memuat keranjang..." setiap kali dibuka.
// count = total quantity dari semua item (bukan jumlah baris).
export const useCartStore = defineStore('cart', {
  state: () => ({
    count: 0,
    items: [],
    subtotal: 0,
    // true setelah cart pernah diambil dari server (sukses / kosong) minimal
    // sekali. Dipakai view untuk memutuskan perlu tampilkan spinner atau tidak.
    loaded: false,
  }),

  actions: {
    // Simpan daftar item cart ke cache + hitung ulang count & subtotal
    // (dipakai CartView setelah menambah / mengurangi / menghapus item —
    // tanpa request tambahan).
    setFromItems(items) {
      this.items = items || []
      this.count = this.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
      this.subtotal = this.items.reduce((sum, i) => sum + (i.lineTotal || 0), 0)
      this.loaded = true
    },

    // Ambil ulang isi cart dari server. Guest (belum login) tidak punya
    // cart, jadi langsung kosong tanpa memanggil API.
    async refresh() {
      const auth = (await import('@/stores/auth.store')).useAuthStore()
      if (!auth.isAuthenticated) {
        this.setFromItems([])
        return
      }
      try {
        const { data } = await api.get('/carts')
        this.setFromItems(data.data?.items)
      } catch {
        // gagal ambil cart -> biarkan cache apa adanya
      }
    },

    reset() {
      this.count = 0
      this.items = []
      this.subtotal = 0
      this.loaded = false
    },
  },
})
