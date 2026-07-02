<script setup>
import { ShoppingCart } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
</script>

<template>
  <header class="border-b border-gray-200">
    <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
      <!-- Logo -->
      <RouterLink to="/" class="text-xl font-extrabold tracking-tight">
        Talita Cakes
      </RouterLink>

      <!-- Nav links -->
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
        <RouterLink to="/" class="hover:text-gray-900">Home</RouterLink>
        <RouterLink to="/menu" class="hover:text-gray-900">Menu</RouterLink>
        <RouterLink to="/gallery" class="hover:text-gray-900">Gallery</RouterLink>
        <RouterLink to="/about" class="hover:text-gray-900">About Us</RouterLink>
      </nav>

      <!-- Right side -->
      <div class="flex items-center gap-4">
        <RouterLink to="/cart" class="relative">
          <ShoppingCart class="w-5 h-5" />
        </RouterLink>

        <RouterLink
          v-if="!authStore.isAuthenticated"
          to="/login"
          class="rounded-full border border-gray-900 px-5 py-2 text-sm font-semibold hover:bg-gray-900 hover:text-white transition"
        >
          Login
        </RouterLink>

        <button
          v-else
          @click="authStore.logout()"
          class="rounded-full border border-gray-900 px-5 py-2 text-sm font-semibold hover:bg-gray-900 hover:text-white transition"
        >
          Logout
        </button>
      </div>
    </div>
  </header>
</template>