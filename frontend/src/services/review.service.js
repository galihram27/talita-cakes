// src/services/review.service.js
import api from '@/lib/api'

/**
 * Ambil rating & ulasan Google Maps toko dari server.
 *
 * CATATAN: saat ini belum dipakai komponen mana pun — GoogleReviews.vue
 * memakai ulasan yang ditulis langsung di dalam berkasnya.
 *
 * Hasilnya di-cache server selama beberapa jam, jadi aman dipanggil setiap
 * halaman dibuka tanpa membebani kuota API Google.
 */
export const getGoogleReviews = async () => {
  const { data } = await api.get('/reviews/google')
  return data.data
}
