import { useAuthStore } from '@/stores/auth.store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

/**
 * Daftar halaman beserta alamatnya.
 *
 * Berkas ini sengaja tidak membuat router-nya sendiri, hanya mengekspor
 * daftarnya. Pembuatannya diserahkan ke main.js, karena halaman situs ini
 * dibangun jadi HTML saat build — dan cara router bekerja saat proses build
 * berbeda dari saat berjalan di peramban.
 *
 * Halaman dimuat sesuai kebutuhan (`() => import(...)`), jadi pengunjung
 * yang hanya membuka beranda tidak ikut mengunduh seluruh halaman admin.
 */
export const routes = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'menu', name: 'menu', component: () => import('@/views/MenuView.vue') },
      {
        path: 'product/:id',
        name: 'product-detail',
        component: () => import('@/views/ProductDetailView.vue'),
      },
      { path: 'gallery', name: 'gallery', component: () => import('@/views/GalleryView.vue') },
      { path: 'about', name: 'about', component: () => import('@/views/AboutView.vue') },
      { path: 'terms', name: 'terms', component: () => import('@/views/TermsView.vue') },
      { path: 'privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
      { path: 'faq', name: 'faq', component: () => import('@/views/FaqView.vue') },
      {
        path: 'cart',
        name: 'cart',
        component: () => import('@/views/CartView.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'checkout',
        name: 'checkout',
        component: () => import('@/views/CheckoutView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'order-success',
        name: 'order-success',
        component: () => import('@/views/OrderSuccessView.vue'),
        meta: { requiresAuth: true },
      },

      // ===== HALAMAN AKUN =====
      // Diletakkan sebagai anak DefaultLayout supaya navbar & footer ikut
      // tampil di halaman login/daftar, bukan halaman kosong tanpa navigasi.
      { path: 'login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
      { path: 'register', name: 'register', component: () => import('@/views/auth/RegisterView.vue') },
      {
        path: 'verify-email',
        name: 'verify-email',
        component: () => import('@/views/auth/VerifyEmailView.vue'),
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/auth/ForgotPasswordView.vue'),
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/views/auth/ResetPasswordView.vue'),
      },
    ],
  },

  // ===== PANEL ADMIN =====
  // Penanda di sini berlaku untuk semua halaman di bawahnya, jadi tidak perlu
  // ditulis ulang satu per satu. Pemeriksaannya ada di registerGuards().
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/analytics' },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: () => import('@/views/admin/AdminAnalyticsView.vue'),
      },
      {
        path: 'products',
        name: 'admin-products',
        component: () => import('@/views/admin/AdminProductsView.vue'),
      },
      {
        path: 'gallery',
        name: 'admin-gallery',
        component: () => import('@/views/admin/AdminGalleryView.vue'),
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('@/views/admin/AdminOrdersView.vue'),
      },
    ],
  },

  // Alamat yang tidak cocok dengan mana pun di atas -> halaman 404.
  // Harus paling bawah, karena polanya menangkap segalanya.
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

/**
 * ===== POSISI GULIRAN HALAMAN =====
 *
 * Posisi terakhir di halaman Menu, diingat sendiri.
 *
 * Perlu dicatat manual karena tombol "kembali ke menu" di halaman produk
 * bukan tombol kembali peramban, melainkan perpindahan halaman biasa. Peramban
 * tidak menganggapnya "kembali", jadi tidak ada posisi tersimpan — akibatnya
 * pengunjung mendarat di paling atas dan harus menggulir lagi mencari kue
 * yang tadi dilihatnya.
 */
let menuScrollTop = 0

export function scrollBehavior(to, from, savedPosition) {
  // Saat halaman dibangun jadi HTML tidak ada peramban sama sekali,
  // jadi tidak ada yang bisa digulir
  if (import.meta.env.SSR) return { top: 0 }

  // Tombol kembali peramban: pakai posisi yang memang sudah disimpannya
  if (savedPosition) return savedPosition

  // Kembali ke Menu dari halaman produk: pulihkan posisi yang kita catat tadi.
  // Ditunda satu frame supaya daftar produknya sempat tergambar dulu —
  // menggulir sebelum itu tidak ada gunanya karena halamannya masih pendek.
  if (to.name === 'menu' && from.name === 'product-detail' && menuScrollTop > 0) {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve({ top: menuScrollTop }))
    })
  }

  return { top: 0 }
}

/**
 * ===== PENJAGA HALAMAN =====
 * Dipanggil dari main.js. Semua pemeriksaan di sini hanya berjalan di
 * peramban — saat halaman dibangun jadi HTML, yang diproses hanya halaman
 * publik sehingga tidak ada yang perlu dijaga.
 */
export function registerGuards(router) {
  // Catat posisi guliran tepat sebelum meninggalkan halaman Menu
  router.beforeEach((to, from) => {
    if (!import.meta.env.SSR && from.name === 'menu') menuScrollTop = window.scrollY
  })

  // Cegat halaman yang butuh login atau hak admin
  router.beforeEach(async (to) => {
    if (import.meta.env.SSR) return true

    const auth = useAuthStore()

    /**
     * Tunggu pemulihan sesi selesai dulu.
     *
     * Penting saat pengunjung memuat ulang halaman admin: sesinya belum
     * sempat dipulihkan, jadi tanpa penantian ini ia akan terlihat seperti
     * belum login dan langsung terlempar ke halaman login — padahal
     * sebenarnya masih punya sesi yang sah.
     */
    if (!auth.isReady) {
      await auth.restoreSession()
    }

    // Penanda dicari sampai ke induknya, jadi halaman admin ikut terjaring
    // walau penandanya hanya ditulis di rute induk
    const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
    const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin)

    // Belum login: antar ke login, alamat tujuannya dititipkan supaya
    // setelah masuk ia kembali ke halaman yang tadi dituju
    if (requiresAuth && !auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // Sudah login tapi bukan admin: dibalas 404, bukan "akses ditolak".
    // Disengaja — pesan penolakan justru memberi tahu bahwa halaman itu ada.
    if (requiresAdmin && !auth.isAdmin) {
      return { name: 'not-found' }
    }

    return true
  })
}
