<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import logo from '@/assets/images/logo.jpeg'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan password wajib diisi'
    return
  }

  isSubmitting.value = true

  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    })

    // balik ke halaman sebelumnya kalau ada (mis. redirect dari route protected),
    // kalau tidak ada, ke home
    router.push(route.query.redirect || '/')
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Email atau password salah'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-16">
    <!-- LOGO -->
    <RouterLink to="/" class="flex flex-col items-center gap-3 mb-6">
      <img
        :src="logo"
        alt="Logo Talita's Cake & Cupcakes"
        class="h-20 w-20 rounded-full object-cover"
      />
      <span class="text-2xl font-extrabold tracking-tight text-brand-600">
        Talita's Cake &amp; Cupcakes
      </span>
    </RouterLink>

    <!-- HEADLINE -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-extrabold mb-2">Sign In</h1>
      <p class="text-sm text-gray-600">
        Selamat datang kembali! Masuk untuk melanjutkan pesananmu.
      </p>
    </div>

    <!-- CARD -->
    <div class="w-full max-w-md border border-gray-200 rounded-2xl p-8">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- EMAIL -->
        <div>
          <label for="email" class="block text-sm font-medium mb-1.5">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Email"
            autocomplete="email"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <!-- PASSWORD -->
        <div>
          <label for="password" class="block text-sm font-medium mb-1.5">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <!-- FORGOT PASSWORD LINK -->
        <p class="text-right text-sm">
          <RouterLink to="/forgot-password" class="font-medium text-brand-600 hover:text-brand-700 hover:underline">
            Lupa password?
          </RouterLink>
        </p>

        <!-- ERROR -->
        <p v-if="errorMessage" class="text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <!-- SUBMIT -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full border border-brand-600 bg-brand-600 text-white py-2.5 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Signing in...' : 'Sign In' }}
        </button>

        <!-- REGISTER LINK -->
        <p class="text-center text-sm text-gray-600">
          Don't have an account?
          <RouterLink to="/register" class="font-bold text-brand-600 hover:underline">
            Register
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>