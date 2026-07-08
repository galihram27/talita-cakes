// src/stores/adminGallery.store.js
import { defineStore } from 'pinia'
import { getGalleries } from '@/services/gallery.service'

const LIMIT = 20
const STORAGE_KEY = 'tc.adminGallery'

// Persist hanya view default (page 1, tanpa search) supaya setelah refresh (F5)
// gallery admin langsung tampil tanpa loading; data baru di-refresh diam-diam.
const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const savePersisted = (items, totalPages, totalItems) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, totalPages, totalItems })
    )
  } catch {
    // storage penuh / privat mode — abaikan, cache in-memory tetap jalan
  }
}

// Cache list gallery untuk halaman ADMIN (terpisah dari gallery.store publik
// karena posisi search & pagination-nya beda). Pola: stale-while-revalidate —
// balik ke halaman admin gallery langsung tampil tanpa loading.
export const useAdminGalleryStore = defineStore('adminGallery', {
  state: () => {
    const persisted = loadPersisted()
    return {
      items: persisted?.items || [],
      search: '',
      page: 1,
      totalPages: persisted?.totalPages ?? 1,
      totalItems: persisted?.totalItems ?? 0,
      hasLoaded: !!persisted, // true kalau ada cache localStorage → skip loading
    }
  },

  getters: {
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
      this.totalItems = result.meta?.total ?? this.items.length
      this.hasLoaded = true

      // simpan hanya view default (page 1, tanpa search) sebagai cache instan
      if (this.page === 1 && !this.search) {
        savePersisted(this.items, this.totalPages, this.totalItems)
      }
    },

    // Dipanggil dari onMounted view. Hanya throw saat first load (belum ada
    // cache); kalau cache sudah ada, refresh jalan diam-diam dan error diabaikan.
    async ensureLoaded() {
      if (this.hasLoaded) {
        // refresh diam-diam hanya kalau masih di halaman 1 — kalau admin sudah
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

    // Refetch dari page 1 SETELAH create/update/delete, tanpa mengosongkan
    // items dulu supaya list lama tetap tampil selama refetch berjalan.
    async refresh() {
      this.page = 1
      await this._fetch()
    },
  },
})
