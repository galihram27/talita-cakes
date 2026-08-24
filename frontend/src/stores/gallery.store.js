// src/stores/gallery.store.js
import { defineStore } from 'pinia'
import { getGalleries } from '@/services/gallery.service'

const LIMIT = 20
const STORAGE_KEY = 'tc.gallery'

/**
 * Simpanan daftar foto galeri untuk halaman publik.
 *
 * Yang disimpan HANYA tampilan awalnya — halaman pertama tanpa kata kunci
 * pencarian. Hasil pencarian tidak ikut disimpan karena kata kuncinya nyaris
 * tak terbatas; menyimpan semuanya cuma memenuhi penyimpanan tanpa banyak
 * terpakai ulang.
 */

// Akses penyimpanan peramban dibungkus try/catch, karena di mode penyamaran
// atau saat penyimpanan penuh ia bisa melempar error
const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const savePersisted = (items, totalPages) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, totalPages }))
  } catch {
    // Lihat catatan di atas
  }
}

export const useGalleryStore = defineStore('gallery', {
  state: () => {
    const persisted = loadPersisted()
    return {
      items: persisted?.items || [],
      search: '',
      page: 1,
      totalPages: persisted?.totalPages ?? 1,
      hasLoaded: !!persisted,
    }
  },

  getters: {
    // Masih ada halaman berikutnya? Dipakai tombol "muat lebih banyak"
    hasMore: (state) => state.page < state.totalPages,
  },

  actions: {
    async _fetch({ append = false } = {}) {
      const result = await getGalleries({
        search: this.search || undefined,
        page: this.page,
        limit: LIMIT,
      })
      this.items = append ? [...this.items, ...result.data] : result.data
      this.totalPages = result.meta?.totalPages ?? 1
      this.hasLoaded = true

      // simpan hanya view default (page 1, tanpa search) sebagai cache instan
      if (this.page === 1 && !this.search) {
        savePersisted(this.items, this.totalPages)
      }
    },

    // Dipanggil dari onMounted view. Hanya throw saat first load (belum ada
    // cache); kalau cache sudah ada, refresh jalan diam-diam dan error diabaikan.
    async ensureLoaded() {
      if (this.hasLoaded) {
        // refresh diam-diam hanya kalau masih di halaman 1 — kalau user sudah
        // load more, refetch page terakhir akan menghapus halaman sebelumnya
        if (this.page === 1) this._fetch().catch(() => {})
        return
      }
      await this._fetch()
    },

    async applySearch(keyword) {
      this.search = keyword
      this.page = 1
      await this._fetch()
    },

    async loadMore() {
      if (!this.hasMore) return
      this.page += 1
      try {
        await this._fetch({ append: true })
      } catch (err) {
        this.page -= 1
        throw err
      }
    },

    // Panggil setelah admin create/update/delete gallery supaya cache tidak basi
    invalidate() {
      this.hasLoaded = false
      this.items = []
      this.search = ''
      this.page = 1
      this.totalPages = 1
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // abaikan
      }
    },
  },
})
