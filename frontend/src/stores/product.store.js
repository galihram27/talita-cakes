// src/stores/product.store.js
import { defineStore } from 'pinia'
import { getAllProducts } from '@/services/product.service'

const STORAGE_KEY = 'tc.products'
const STORAGE_TIME_KEY = 'tc.products.at'

// Selama cache belum lewat TTL, buka-tutup halaman tidak menembak DB lagi.
// Katalog jarang berubah (admin update sesekali), jadi 10 menit aman —
// dan admin tetap memanggil invalidate()/refresh() setelah menyunting produk.
const CACHE_TTL_MS = 10 * 60 * 1000

const loadPersistedAt = () => {
  try {
    return Number(localStorage.getItem(STORAGE_TIME_KEY)) || 0
  } catch {
    return 0
  }
}

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
    localStorage.setItem(STORAGE_TIME_KEY, String(Date.now()))
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
      fetchedAt: persisted ? loadPersistedAt() : 0,
      _inflight: null, // guard supaya tidak ada request dobel
    }
  },

  getters: {
    // Cache dianggap basi kalau umurnya sudah lewat TTL.
    isStale: (state) => Date.now() - state.fetchedAt > CACHE_TTL_MS,
  },

  actions: {
    // Dipanggil dari onMounted view. Hanya throw kalau belum ada cache sama
    // sekali (first load); kalau cache sudah ada, error refresh diabaikan.
    async ensureLoaded() {
      if (this.hasLoaded) {
        // Cache masih segar -> tidak perlu menembak DB sama sekali.
        // Ini yang menekan transfer Neon: sebelumnya tiap pindah halaman
        // selalu menarik ulang seluruh katalog walau datanya identik.
        if (this.isStale) this._refresh().catch(() => {})
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
            this.fetchedAt = Date.now()
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
      this.fetchedAt = 0
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(STORAGE_TIME_KEY)
      } catch {
        // abaikan
      }
    },
  },
})
