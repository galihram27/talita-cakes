// src/stores/adminOrders.store.js
import { defineStore } from 'pinia'
import api from '@/lib/api'
import { updateOrderStatus } from '@/services/order.service'

const STORAGE_KEY = 'tc.adminOrders'

/**
 * Simpanan daftar pesanan untuk halaman admin.
 *
 * Polanya sama dengan simpanan katalog produk: tampilkan yang tersimpan dulu,
 * perbarui diam-diam di latar belakang.
 *
 * Bedanya satu hal penting — isinya berisi data pribadi pembeli (nama, nomor
 * telepon, alamat). Karena itu simpanannya WAJIB dibuang saat admin keluar,
 * lihat invalidate() di bawah.
 */

// Semua akses ke penyimpanan peramban dibungkus try/catch, karena di mode
// penyamaran atau saat penyimpanan penuh ia bisa melempar error
const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const savePersisted = (orders) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // Lihat catatan di atas
  }
}

export const useAdminOrdersStore = defineStore('adminOrders', {
  state: () => {
    const persisted = loadPersisted()
    return {
      orders: persisted || [],
      hasLoaded: !!persisted,
      // Penampung permintaan yang sedang berjalan, supaya tidak menembak
      // server berkali-kali kalau diminta bersamaan
      _inflight: null,
    }
  },

  actions: {
    // Kalau daftar sudah ada, halaman langsung tampil dan pembaruan berjalan
    // diam-diam. Hanya saat belum ada apa-apa kegagalannya diteruskan.
    async ensureLoaded() {
      if (this.hasLoaded) {
        this._refresh().catch(() => {})
        return
      }
      await this._refresh()
    },

    _refresh() {
      if (!this._inflight) {
        this._inflight = api
          .get('/orders/admin/all')
          .then(({ data }) => {
            this.orders = data.data || []
            this.hasLoaded = true
            savePersisted(this.orders)
          })
          .finally(() => {
            this._inflight = null
          })
      }
      return this._inflight
    },

    /**
     * Ubah status sebuah pesanan.
     *
     * Tampilan diubah lebih dulu, sebelum server menjawab, supaya terasa
     * responsif. Kalau ternyata server menolak, statusnya dikembalikan ke
     * nilai semula — jangan sampai layar menampilkan sesuatu yang sebenarnya
     * tidak tersimpan.
     */
    async updateStatus(orderId, status) {
      const order = this.orders.find((o) => o.id === orderId)
      const previousStatus = order?.status

      if (order) {
        order.status = status
        savePersisted(this.orders)
      }

      try {
        await updateOrderStatus(orderId, status)
      } catch (err) {
        if (order) {
          order.status = previousStatus
          savePersisted(this.orders)
        }
        throw err
      }
    },

    // Buang seluruh simpanan. Dipanggil saat admin keluar, supaya data
    // pesanan beserta identitas pembelinya tidak tertinggal di komputer itu
    // dan terbaca orang berikutnya yang memakainya.
    invalidate() {
      this.orders = []
      this.hasLoaded = false
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Lihat catatan di atas
      }
    },
  },
})
