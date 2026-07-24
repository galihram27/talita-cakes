// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Rute publik statis yang selalu diprerender (butuh SEO).
const STATIC_PUBLIC_ROUTES = [
  '/',
  '/menu',
  '/gallery',
  '/about',
  '/faq',
  '/terms',
  '/privacy',
]

// Ambil daftar id produk dari backend saat build supaya tiap halaman detail
// (/product/:id) ikut diprerender. Kalau API tak terjangkau, jangan gagalkan
// build — cukup prerender halaman statis (produk tetap jalan via client SPA).
async function fetchProductRoutes(apiBase) {
  try {
    const res = await fetch(`${apiBase}/products`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const ids = (json.data || []).map((p) => p.id).filter(Boolean)
    console.log(`[ssg] ${ids.length} halaman produk akan diprerender`)
    return ids.map((id) => `/product/${id}`)
  } catch (err) {
    console.warn(
      `[ssg] gagal ambil daftar produk dari ${apiBase} (${err.message}); ` +
        `prerender halaman statis saja — pastikan backend hidup saat build.`
    )
    return []
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv membaca .env (VITE_API_BASE_URL) untuk dipakai saat build di Node.
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:3000/api'

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // ===== ViteSSG =====
    // Hanya rute PUBLIK yang diprerender jadi HTML statis. Rute privat (cart,
    // checkout, profile, admin, auth) tetap jalan sebagai SPA di client.
    ssgOptions: {
      async includedRoutes() {
        const productRoutes = await fetchProductRoutes(apiBase)
        return [...STATIC_PUBLIC_ROUTES, ...productRoutes]
      },
    },
  }
})
