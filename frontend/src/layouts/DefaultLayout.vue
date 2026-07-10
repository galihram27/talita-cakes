<script setup>
import Navbar from '@/components/common/Navbar.vue'
import Footer from '@/components/common/Footer.vue'
import pageBg from '@/assets/images/Figure Fondant Cake.png'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-page text-cocoa-900">
    <Navbar />
    <main
      class="flex-1 bg-cover bg-center bg-fixed"
      :style="{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), url(${pageBg})`,
      }"
    >
      <RouterView />
    </main>
    <Footer />
  </div>
</template>
