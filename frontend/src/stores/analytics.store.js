// src/stores/analytics.store.js
import { defineStore } from 'pinia'
import { getDashboardStats } from '@/services/analytics.service'
import { getProductCount } from '@/services/product.service'
import { getGalleries } from '@/services/gallery.service'

// Cache data dashboard analytics per filter bulan supaya balik ke halaman
// admin analytics (atau ganti-ganti filter bulan) langsung tampil tanpa
// loading. Pola: stale-while-revalidate — tampilkan cache dulu, refresh
// diam-diam di background.
export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    // key = 'all' | 'YYYY-MM', value = { totalVisitors, totalOrders, visitors,
    // orders, totalProducts, totalGalleryImages }
    cache: {},
    _inflight: {}, // guard per-key supaya tidak ada request dobel
  }),

  actions: {
    // Dipanggil dari onMounted / watch filter di view. Hanya throw kalau
    // belum ada cache untuk key itu; kalau sudah ada, error refresh diabaikan.
    async ensureLoaded(key, params) {
      if (this.cache[key]) {
        this._refresh(key, params).catch(() => {})
        return
      }
      await this._refresh(key, params)
    },

    _refresh(key, params) {
      if (!this._inflight[key]) {
        this._inflight[key] = Promise.all([
          getDashboardStats(params),
          getProductCount(),
          getGalleries({ page: 1, limit: 1 }),
        ])
          .then(([stats, productCount, galleryRes]) => {
            this.cache[key] = {
              totalVisitors: stats.totalVisitors ?? 0,
              totalOrders: stats.totalOrders ?? 0,
              visitors: stats.visitors ?? [],
              orders: stats.orders ?? [],
              totalProducts: productCount ?? 0,
              totalGalleryImages: galleryRes.meta?.total ?? 0,
            }
          })
          .finally(() => {
            delete this._inflight[key]
          })
      }
      return this._inflight[key]
    },

    // Panggil setelah admin mengubah produk/gallery supaya angka stat card
    // tidak basi. Cache dibiarkan tampil dulu; refresh jalan saat view aktif.
    invalidate() {
      this.cache = {}
    },
  },
})
