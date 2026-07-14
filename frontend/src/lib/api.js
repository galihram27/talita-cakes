// src/lib/api.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  withCredentials: true, // wajib, supaya cookie refreshToken httpOnly terkirim
})

// Attach accessToken dari Pinia store ke setiap request
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

// Auto-retry sekali kalau kena 401 (access token expired)
let isRefreshing = false
let refreshQueue = []

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh-token')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // kalau ada refresh yang sedang jalan, antre dulu
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await api.post('/auth/refresh-token')
        const newAccessToken = data.data.accessToken

        authStore.setAccessToken(newAccessToken)
        processQueue(null, newAccessToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        authStore.clearSession() // refresh token juga invalid -> logout paksa

        // Sesi benar-benar habis / guest melakukan aksi yang butuh login (mis.
        // menambah produk ke keranjang). Alih-alih membiarkan pesan mentah
        // "Refresh token required" muncul, arahkan ke halaman login sambil
        // menyimpan halaman saat ini di query.redirect supaya bisa balik ke
        // sini setelah login (LoginView membaca route.query.redirect).
        // Dynamic import router: hindari circular dependency api <-> router.
        const { default: router } = await import('@/router')
        const current = router.currentRoute.value
        if (current.name !== 'login') {
          router.push({ name: 'login', query: { redirect: current.fullPath } })
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api