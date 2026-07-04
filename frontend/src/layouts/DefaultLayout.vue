<script setup>
import Navbar from '@/components/common/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-page text-gray-900">
    <Navbar />
    <main>
      <RouterView />
    </main>
  </div>
</template>