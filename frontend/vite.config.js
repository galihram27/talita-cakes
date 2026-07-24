// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // ===== ViteSSG =====
  // Hanya rute PUBLIK yang diprerender jadi HTML statis (butuh SEO). Rute privat
  // (cart, checkout, profile, admin, auth) tetap jalan sebagai SPA di client.
  // Rute dinamis /product/:id akan ditambah di Fase 4 (ambil daftar id produk
  // dari backend saat build).
  ssgOptions: {
    includedRoutes(paths) {
      const publicRoutes = [
        '/',
        '/menu',
        '/gallery',
        '/about',
        '/faq',
        '/terms',
        '/privacy',
      ]
      // buang rute privat/auth/admin & dinamis dari hasil crawl otomatis
      return publicRoutes
    },
  },
})