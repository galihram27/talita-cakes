<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import logo from '@/assets/images/logo.png'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const cartStore = useCartStore()

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

    // isi badge keranjang milik user yang baru login
    cartStore.refresh()

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
  <div class="tc-page min-h-screen bg-page flex flex-col items-center justify-start px-5 pt-12 pb-20">
    <!-- LOGO -->
    <RouterLink to="/" class="flex flex-col items-center gap-3 mb-6">
      <img
        :src="logo"
        alt="Logo Talita's Cake & Cupcakes"
        class="h-20 w-20 object-contain"
      />
      <span class="font-display text-2xl text-cocoa-900">
        Talita's Cake &amp; Cupcakes
      </span>
    </RouterLink>

    <!-- CARD -->
    <div class="w-full max-w-[440px] bg-white border border-cream-300 rounded-[20px] p-8 pb-7">
      <h1 class="font-display text-[28px] mb-1.5">Welcome back</h1>
      <p class="text-[#6E5A4D] text-[14.5px] mb-6">Sign in to continue your order.</p>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <!-- EMAIL -->
        <div>
          <label for="email" class="block font-extrabold text-[13.5px] mb-1.5">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="name@email.com"
            autocomplete="email"
            class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
          />
        </div>

        <!-- PASSWORD -->
        <div>
          <label for="password" class="block font-extrabold text-[13.5px] mb-1.5">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
          />
          <p class="text-right mt-2">
            <RouterLink
              to="/forgot-password"
              class="text-brand-500 font-bold text-[13.5px] hover:opacity-70"
            >
              Forgot password?
            </RouterLink>
          </p>
        </div>

        <!-- ERROR -->
        <div
          v-if="errorMessage"
          class="bg-[#FBE9E7] border border-[#F0C9C4] text-brand-500 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold"
        >
          {{ errorMessage }}
        </div>

        <!-- SUBMIT -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full bg-brand-500 text-white py-3.5 text-[15px] font-extrabold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <!-- REGISTER LINK -->
      <p class="border-t border-cream-200 mt-5 pt-4 text-center text-sm text-[#6E5A4D]">
        Don't have an account?
        <RouterLink to="/register" class="font-extrabold text-brand-500 hover:opacity-70">
          Sign up
        </RouterLink>
      </p>
    </div>
  </div>
</template>