<script setup>
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import { useProductStore } from '@/stores/product.store'
import { useGalleryStore } from '@/stores/gallery.store'
import { reportVisit } from '@/services/analytics.service'
import { SITE_NAME, DEFAULT_DESCRIPTION } from '@/config/seo'
import WhatsAppButton from '@/components/common/WhatsAppButton.vue'

const authStore = useAuthStore()
const cartStore = useCartStore()
const productStore = useProductStore()
const galleryStore = useGalleryStore()

/**
 * Komponen akar aplikasi. Dua tugasnya: memasang pengaturan bawaan untuk
 * mesin pencari, dan menyiapkan data awal begitu aplikasi terbuka.
 */

// Nilai bawaan yang berlaku di semua halaman. Tiap halaman boleh menimpanya
// dengan judul & keterangannya sendiri. `titleTemplate` yang menempelkan nama
// toko ke judul, jadi halaman cukup menulis judul singkatnya saja.
useHead({
  titleTemplate: (title) => (title ? `${title} - ${SITE_NAME}` : SITE_NAME),
  htmlAttrs: { lang: 'id' },
  meta: [
    { name: 'description', content: DEFAULT_DESCRIPTION },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
})

/**
 * Persiapan awal, urutannya disengaja.
 *
 * Pemulihan sesi ditunggu lebih dulu karena dua langkah setelahnya bergantung
 * padanya: keranjang hanya ada untuk yang sudah login, dan pencatatan
 * kunjungan perlu tahu siapa pengunjungnya supaya bisa dikaitkan ke akunnya.
 *
 * Sisanya berjalan bersamaan tanpa ditunggu — semuanya persiapan di latar
 * belakang, jadi kegagalannya tidak perlu mengganggu halaman.
 */
onMounted(async () => {
  await authStore.restoreSession()

  cartStore.refresh()
  reportVisit()

  // Katalog & galeri diambil lebih dulu selagi pengunjung membaca beranda,
  // supaya halaman Menu dan Galeri langsung terisi saat dibuka
  productStore.ensureLoaded().catch(() => {})
  galleryStore.ensureLoaded().catch(() => {})
})
</script>

<template>
  <!-- Isi halaman selalu digambar, termasuk saat dibangun jadi HTML — jadi
       berkas HTML-nya tidak pernah kosong dan bisa dibaca mesin pencari.
       Halaman yang perlu dijaga tetap aman, karena penjagaannya dilakukan
       router, bukan dengan cara menyembunyikan isinya di sini. -->
  <router-view />
  <WhatsAppButton />
</template>