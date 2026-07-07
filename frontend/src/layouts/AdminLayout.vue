<script setup>
import { onMounted } from 'vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import { useAdminOrdersStore } from '@/stores/adminOrders.store'

const adminOrdersStore = useAdminOrdersStore()

// Preload chunk semua halaman admin begitu layout admin tampil, supaya
// pindah antar-menu admin tidak perlu menunggu download chunk lagi
// (route pakai lazy import; Vite otomatis dedup dengan import router).
onMounted(() => {
  import('@/views/admin/AdminAnalyticsView.vue')
  import('@/views/admin/AdminProductsView.vue')
  import('@/views/admin/AdminGalleryView.vue')
  import('@/views/admin/AdminOrdersView.vue')

  // prefetch list pesanan diam-diam begitu masuk panel, supaya saat klik
  // menu "Pesanan" cache sudah panas → tampil tanpa loading
  adminOrdersStore.ensureLoaded().catch(() => {})
})
</script>

<template>
  <!-- Layout admin: sidebar gelap full-height di kiri, konten krem di kanan -->
  <div class="min-h-screen bg-page text-cocoa-900 flex flex-col md:flex-row">
    <AdminSidebar />
    <main class="flex-1 min-w-0 px-5 md:px-10 py-8">
      <RouterView />
    </main>
  </div>
</template>
