import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes = [
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

      // ===== AUTH (dipindah ke sini supaya Navbar dari DefaultLayout ikut tampil) =====
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

  // ===== ADMIN =====
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

  // ===== 404 =====
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Setiap pindah halaman, mulai dari atas. Saat back/forward (savedPosition),
  // kembalikan ke posisi scroll sebelumnya.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

// Navigation guard: proteksi route berdasarkan meta requiresAuth / requiresAdmin
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Tunggu sesi selesai dipulihkan (penting saat user refresh halaman admin)
  if (!auth.isReady) {
    await auth.restoreSession()
  }

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin)

  // Belum login -> arahkan ke login
  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Bukan admin tapi coba akses halaman admin -> lempar ke 404 / home
  // (pakai 404 supaya user tidak "tahu" bahwa halaman admin itu ada)
  if (requiresAdmin && !auth.isAdmin) {
    return { name: 'not-found' }
  }

  return true
})

export default router