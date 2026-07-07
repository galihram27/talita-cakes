// src/services/review.service.js
import api from '@/lib/api'

/**
 * GET /reviews/google
 * Mengembalikan { placeName, rating, totalReviews, googleMapsUrl, reviews[] }.
 * Backend meng-cache hasilnya, jadi aman dipanggil di setiap page load.
 */
export const getGoogleReviews = async () => {
  const { data } = await api.get('/reviews/google')
  return data.data
}
