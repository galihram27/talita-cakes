<script setup>
import { onMounted } from 'vue'
import Navbar from '@/components/common/Navbar.vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'

// Preload chunk semua halaman admin begitu layout admin tampil, supaya
// pindah antar-menu admin tidak perlu menunggu download chunk lagi
// (route pakai lazy import; Vite otomatis dedup dengan import router).
onMounted(() => {
  import('@/views/admin/AdminAnalyticsView.vue')
  import('@/views/admin/AdminProductsView.vue')
  import('@/views/admin/AdminGalleryView.vue')
  import('@/views/admin/AdminOrdersView.vue')
})
</script>

<template>
  <div class="min-h-screen bg-page text-gray-900">
    <Navbar />
    <div class="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminSidebar />
      <main class="flex-1 min-w-0">
        <RouterView />
      </main>
    </div>
  </div>
</template>
