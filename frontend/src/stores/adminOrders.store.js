// src/stores/adminOrders.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'

const STORAGE_KEY = 'tc.adminOrders'

// Baca cache dari localStorage supaya setelah refresh (F5) list order langsung
// tampil tanpa loading; data baru tetap di-refresh diam-diam di background.
const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const savePersisted = (orders) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // storage penuh / privat mode — abaikan, cache in-memory tetap jalan
  }
}

// Cache list order untuk halaman admin. Pola: stale-while-revalidate —
// balik ke halaman admin orders langsung tampil tanpa loading,
// refresh jalan diam-diam di background.
export const useAdminOrdersStore = defineStore('adminOrders', {
  state: () => {
    const persisted = loadPersisted()
    return {
      orders: persisted || [],
      hasLoaded: !!persisted, // true kalau ada cache localStorage → skip loading
      _inflight: null, // guard supaya tidak ada request dobel
    }
  },

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
            savePersisted(this.orders)
          })
          .finally(() => {
            this._inflight = null
          })
      }
      return this._inflight
    },

    // Kosongkan cache order (dipanggil saat logout) supaya data pesanan yang
    // sensitif tidak tertinggal di localStorage untuk sesi/orang berikutnya.
    invalidate() {
      this.orders = []
      this.hasLoaded = false
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // abaikan
      }
    },
  },
})
