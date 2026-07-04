// src/stores/gallery.store.js
import { defineStore } from 'pinia'
import { getGalleries } from '@/services/gallery.service'

const LIMIT = 20

// Cache list gallery (termasuk posisi search & pagination) supaya balik ke
// halaman Gallery langsung tampil tanpa loading. Pola: stale-while-revalidate.
export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    items: [],
    search: '',
    page: 1,
    totalPages: 1,
    hasLoaded: false, // true setelah fetch pertama sukses
  }),

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
      this.hasLoaded = true
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
    },
  },
})
