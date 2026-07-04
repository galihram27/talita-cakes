// src/stores/product.store.js
import { defineStore } from 'pinia'
import { getAllProducts } from '@/services/product.service'

// Cache katalog produk supaya pindah halaman (Menu <-> lainnya) tidak perlu
// loading ulang. Pola: stale-while-revalidate — tampilkan cache dulu,
// refresh diam-diam di background.
export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    hasLoaded: false, // true setelah fetch pertama sukses
    _inflight: null, // guard supaya tidak ada request dobel
  }),

  actions: {
    // Dipanggil dari onMounted view. Hanya throw kalau belum ada cache sama
    // sekali (first load); kalau cache sudah ada, error refresh diabaikan.
    async ensureLoaded() {
      if (this.hasLoaded) {
        this._refresh().catch(() => {})
        return
      }
      await this._refresh()
    },

    _refresh() {
      if (!this._inflight) {
        this._inflight = getAllProducts()
          .then((products) => {
            this.products = products || []
            this.hasLoaded = true
          })
          .finally(() => {
            this._inflight = null
          })
      }
      return this._inflight
    },

    // Refetch tanpa mengosongkan cache — list lama tetap tampil selama
    // refetch berjalan. Dipakai admin setelah create/update/delete produk.
    refresh() {
      return this._refresh()
    },

    // Panggil setelah admin create/update/delete produk supaya cache tidak basi
    invalidate() {
      this.hasLoaded = false
    },
  },
})
