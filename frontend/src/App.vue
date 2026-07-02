<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

onMounted(() => {
  authStore.restoreSession()
})
</script>

<template>
  <div v-if="authStore.isReady">
    <router-view />
  </div>
  <div v-else class="flex items-center justify-center h-screen">
    <!-- loading spinner sederhana, hindari flicker guest/login -->
  </div>
</template>