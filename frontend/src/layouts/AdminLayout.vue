<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import { useAdminOrdersStore } from '@/stores/adminOrders.store'

const adminOrdersStore = useAdminOrdersStore()
const route = useRoute()

/**
 * Kerangka halaman panel admin: sidebar di kiri, isi halaman di kanan.
 *
 * Begitu panel dibuka, seluruh halaman admin diunduh di latar belakang.
 * Halaman-halaman itu sebenarnya dimuat sesuai kebutuhan, tapi admin biasanya
 * berpindah-pindah menu, jadi lebih baik menunggu sekali di awal daripada
 * menunggu sedikit setiap kali berpindah.
 */
onMounted(() => {
  import('@/views/admin/AdminAnalyticsView.vue')
  import('@/views/admin/AdminProductsView.vue')
  import('@/views/admin/AdminGalleryView.vue')
  import('@/views/admin/AdminOrdersView.vue')

  // Daftar pesanan ikut diambil lebih dulu supaya menu "Pesanan" langsung
  // terisi saat diklik. Kegagalan diabaikan — ini cuma persiapan, bukan
  // sesuatu yang perlu dilaporkan ke admin.
  adminOrdersStore.ensureLoaded().catch(() => {})
})
</script>

<template>
  <!-- Sidebar berdampingan di layar besar, bertumpuk ke bawah di layar kecil -->
  <div class="min-h-screen bg-page text-cocoa-900 flex flex-col md:flex-row">
    <AdminSidebar />
    <main class="flex-1 min-w-0 px-5 md:px-10 py-8">
      <!-- Animasi masuk halaman, sama dengan sisi pengunjung. Cukup dipasang
           sekali di sini, tidak perlu di tiap halaman admin.

           `key` berisi alamat halaman itu penting: tanpanya Vue menganggap
           ini elemen yang sama saat berpindah menu, sehingga animasinya cuma
           jalan sekali di awal. Dengan key, elemennya dibuat ulang tiap
           pindah menu dan animasinya terputar lagi. -->
      <div :key="route.path" class="tc-page">
        <RouterView />
      </div>
    </main>
  </div>
</template>
