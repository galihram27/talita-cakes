// src/stores/adminOrders.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'

// Cache list order untuk halaman admin. Pola: stale-while-revalidate —
// balik ke halaman admin orders langsung tampil tanpa loading,
// refresh jalan diam-diam di background.
export const useAdminOrdersStore = defineStore('adminOrders', {
  state: () => ({
    orders: [],
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
        this._inflight = api
          .get('/orders/admin/all')
          .then(({ data }) => {
            this.orders = data.data || []
            this.hasLoaded = true
          })
          .finally(() => {
            this._inflight = null
          })
      }
      return this._inflight
    },
  },
})
