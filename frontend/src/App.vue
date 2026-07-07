<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import { useProductStore } from '@/stores/product.store'
import { useGalleryStore } from '@/stores/gallery.store'
import WhatsAppButton from '@/components/common/WhatsAppButton.vue'

const authStore = useAuthStore()
const cartStore = useCartStore()
const productStore = useProductStore()
const galleryStore = useGalleryStore()

onMounted(async () => {
  await authStore.restoreSession()
  // setelah sesi dipulihkan, isi jumlah item cart untuk badge di Navbar
  cartStore.refresh()

  // prefetch katalog & gallery diam-diam selagi user di Home, supaya saat
  // pindah ke Menu/Gallery cache sudah panas → tampil tanpa loading
  productStore.ensureLoaded().catch(() => {})
  galleryStore.ensureLoaded().catch(() => {})
})
</script>

<template>
  <div v-if="authStore.isReady">
    <router-view />
    <WhatsAppButton />
  </div>
  <div v-else class="flex items-center justify-center h-screen">
    <!-- loading spinner sederhana, hindari flicker guest/login -->
  </div>
</template>