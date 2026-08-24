// src/stores/analytics.store.js
import { defineStore } from 'pinia'
import { getDashboardStats } from '@/services/analytics.service'
import { getProductCount } from '@/services/product.service'
import { getGalleries } from '@/services/gallery.service'

/**
 * Simpanan angka-angka dashboard admin.
 *
 * Berbeda dari simpanan lain di folder ini, yang ini disimpan PER PILIHAN
 * BULAN — masing-masing punya simpanannya sendiri. Dengan begitu admin bisa
 * bolak-balik antar bulan tanpa menunggu, karena bulan yang pernah dibuka
 * angkanya sudah tersimpan.
 *
 * Hanya di memori, tidak ikut disimpan di penyimpanan peramban: angkanya
 * cepat berubah, jadi menyimpannya lebih lama justru menyesatkan.
 */
export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    // Kuncinya 'all' atau bulan tertentu ('2026-07'); isinya angka ringkasan
    // beserta data grafik pengunjung & pesanan
    cache: {},
    // Permintaan yang sedang berjalan, dicatat per bulan supaya bulan yang
    // berbeda tetap bisa diambil bersamaan
    _inflight: {},
  }),

  actions: {
    // Kalau bulan itu sudah pernah dibuka, angkanya langsung tampil dan
    // pembaruan berjalan diam-diam. Hanya bulan yang belum pernah dibuka
    // yang kegagalannya diteruskan ke halaman.
    async ensureLoaded(key, params) {
      if (this.cache[key]) {
        this._refresh(key, params).catch(() => {})
        return
      }
      await this._refresh(key, params)
    },

    // Tiga sumber angka diambil sekaligus, bukan berurutan, supaya
    // dashboard tidak menunggu tiga kali lamanya
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

    // Dipanggil setelah admin mengubah produk atau galeri, supaya angka
    // "total produk" & "total foto" ikut menyesuaikan. Angkanya diambil ulang
    // saat halaman dashboard dibuka lagi, bukan saat itu juga.
    invalidate() {
      this.cache = {}
    },
  },
})
