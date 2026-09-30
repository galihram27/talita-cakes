<script setup>
import Navbar from '@/components/common/Navbar.vue'
import Footer from '@/components/common/Footer.vue'
import pageBg from '@/assets/images/Figure Fondant Cake.png'

// Kerangka halaman untuk sisi pengunjung: navbar di atas, isi halaman di
// tengah, footer di bawah. Halaman admin memakai kerangkanya sendiri.
</script>

<template>
  <!-- min-h-screen + flex-col + flex-1 pada <main>: kalau isi halaman pendek,
       sisa ruangnya diisi <main> sehingga footer tetap turun ke dasar layar
       dan tidak menggantung di tengah. -->
  <div class="min-h-screen flex flex-col bg-page text-cocoa-900">
    <Navbar />
    <!-- Foto kue jadi latar seluruh halaman, ditumpuk lapisan putih tembus
         pandang supaya teks di atasnya tetap terbaca. bg-fixed membuat latar
         diam di tempat saat halaman digulir. -->
    <main
      class="flex-1 bg-cover bg-center bg-fixed"
      :style="{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), url(${pageBg})`,
      }"
    >
      <!-- Pindah dari satu produk ke produk lain (mis. lewat tautan di chat)
           memakai rute yang sama, dan Vue memakai ulang komponennya: data
           dan pilihan ukuran/rasa produk sebelumnya ikut tertinggal. Key
           per alamat membuat halaman produk dibuat ulang. Halaman lain
           tidak diberi key, jadi perilakunya tetap seperti sebelumnya. -->
      <RouterView v-slot="{ Component, route }">
        <component
          :is="Component"
          :key="route.name === 'product-detail' ? route.path : undefined"
        />
      </RouterView>
    </main>
    <Footer />
  </div>
</template>
