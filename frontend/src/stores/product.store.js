// src/stores/product.store.js
import { defineStore } from 'pinia'
import { getAllProducts } from '@/services/product.service'

/**
 * Simpanan katalog produk.
 *
 * Cara kerjanya: tampilkan dulu data yang tersimpan, lalu perbarui diam-diam
 * di latar belakang. Jadi pengunjung tidak pernah menunggu, tapi tetap
 * mendapat data terbaru sesaat kemudian.
 *
 * Disimpan di dua tempat sekaligus: di memori selama halaman terbuka, dan di
 * penyimpanan peramban supaya katalog langsung tampil bahkan setelah halaman
 * dimuat ulang.
 *
 * Tujuan utamanya menekan jumlah permintaan ke database. Sebelumnya setiap
 * berpindah halaman menarik ulang seluruh katalog walau isinya sama persis.
 */

const STORAGE_KEY = 'tc.products'
const STORAGE_TIME_KEY = 'tc.products.at'

// Umur simpanan sebelum dianggap perlu diperbarui. Sepuluh menit dipilih
// karena katalog jarang berubah — dan kalaupun admin menyuntingnya, ia
// memanggil invalidate() sehingga perubahannya langsung terlihat.
const CACHE_TTL_MS = 10 * 60 * 1000

const loadPersistedAt = () => {
  try {
    return Number(localStorage.getItem(STORAGE_TIME_KEY)) || 0
  } catch {
    return 0
  }
}

// Semua akses ke penyimpanan peramban dibungkus try/catch, karena di mode
// penyamaran atau saat penyimpanan penuh ia bisa melempar error. Gagal
// menyimpan bukan masalah — simpanan di memori tetap berjalan.
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
    // Lihat catatan di atas
  }
}

export const useProductStore = defineStore('product', {
  state: () => {
    // Isi awal diambil dari penyimpanan peramban, jadi katalog sudah ada
    // sejak detik pertama halaman dibuka
    const persisted = loadPersisted()
    return {
      products: persisted || [],
      hasLoaded: !!persisted,
      fetchedAt: persisted ? loadPersistedAt() : 0,
      // Penampung permintaan yang sedang berjalan, supaya beberapa halaman
      // yang meminta bersamaan tidak menembak server berkali-kali
      _inflight: null,
    }
  },

  getters: {
    isStale: (state) => Date.now() - state.fetchedAt > CACHE_TTL_MS,
  },

  actions: {
    /**
     * Dipanggil halaman saat dibuka.
     *
     * Kalau katalog sudah ada, halaman langsung tampil dan pembaruan berjalan
     * diam-diam — kegagalannya pun diabaikan, karena yang lama masih layak
     * ditampilkan. Hanya saat belum ada apa-apa kegagalannya diteruskan,
     * sebab di situ halaman memang tidak punya yang bisa ditampilkan.
     */
    async ensureLoaded() {
      if (this.hasLoaded) {
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

    // Ambil ulang tanpa mengosongkan yang lama, jadi daftar tetap tampil
    // selama pembaruan berjalan. Dipakai admin setelah menyunting produk.
    refresh() {
      return this._refresh()
    },

    // Buang simpanan sepenuhnya, memaksa pengambilan ulang berikutnya.
    // Dipakai admin setelah menghapus produk, supaya yang sudah tidak ada
    // tidak sempat terlihat lagi.
    invalidate() {
      this.hasLoaded = false
      this.fetchedAt = 0
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(STORAGE_TIME_KEY)
      } catch {
        // Lihat catatan di atas
      }
    },
  },
})
