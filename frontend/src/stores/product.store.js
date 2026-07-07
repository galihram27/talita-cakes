// src/stores/product.store.js
import { defineStore } from 'pinia'
import { getAllProducts } from '@/services/product.service'

const STORAGE_KEY = 'tc.products'

// Baca cache dari localStorage supaya setelah refresh (F5) katalog langsung
// tampil tanpa loading; data baru tetap di-refresh diam-diam di background.
const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const savePersisted = (products) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch {
    // storage penuh / privat mode — abaikan, cache in-memory tetap jalan
  }
}

// Cache katalog produk supaya pindah halaman (Menu <-> lainnya) tidak perlu
// loading ulang. Pola: stale-while-revalidate — tampilkan cache dulu,
// refresh diam-diam di background.
export const useProductStore = defineStore('product', {
  state: () => {
    const persisted = loadPersisted()
    return {
      products: persisted || [],
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
        this._inflight = getAllProducts()
          .then((products) => {
            this.products = products || []
            this.hasLoaded = true
            savePersisted(this.products)
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
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // abaikan
      }
    },
  },
})
