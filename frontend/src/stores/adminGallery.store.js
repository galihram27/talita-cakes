// src/stores/adminGallery.store.js
import { defineStore } from 'pinia'
import { getGalleries } from '@/services/gallery.service'

const LIMIT = 20
const STORAGE_KEY = 'tc.adminGallery'

/**
 * Simpanan daftar foto galeri untuk halaman ADMIN.
 *
 * Dipisah dari simpanan galeri publik walau datanya dari sumber yang sama,
 * karena keduanya punya kata kunci pencarian & posisi halaman sendiri-sendiri.
 * Kalau digabung, mencari sesuatu di panel admin akan ikut mengubah tampilan
 * galeri yang dilihat pengunjung.
 *
 * Seperti versi publiknya, yang disimpan hanya tampilan awal tanpa pencarian.
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

const savePersisted = (items, totalPages, totalItems) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, totalPages, totalItems })
    )
  } catch {
    // Lihat catatan di atas
  }
}

export const useAdminGalleryStore = defineStore('adminGallery', {
  state: () => {
    const persisted = loadPersisted()
    return {
      items: persisted?.items || [],
      search: '',
      page: 1,
      totalPages: persisted?.totalPages ?? 1,
      totalItems: persisted?.totalItems ?? 0,
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
