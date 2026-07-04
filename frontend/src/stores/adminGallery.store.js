// src/stores/adminGallery.store.js
import { defineStore } from 'pinia'
import { getGalleries } from '@/services/gallery.service'

const LIMIT = 20

// Cache list gallery untuk halaman ADMIN (terpisah dari gallery.store publik
// karena posisi search & pagination-nya beda). Pola: stale-while-revalidate —
// balik ke halaman admin gallery langsung tampil tanpa loading.
export const useAdminGalleryStore = defineStore('adminGallery', {
  state: () => ({
    items: [],
    search: '',
    page: 1,
    totalPages: 1,
    totalItems: 0,
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
      this.totalItems = result.meta?.total ?? this.items.length
      this.hasLoaded = true
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
