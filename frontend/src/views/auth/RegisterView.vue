<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptedTerms = ref(false)

const errorMessage = ref('')
const isSubmitting = ref(false)

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!name.value || !email.value || !phone.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Semua field wajib diisi'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Password dan Confirm Password tidak sama'
    return
  }

  if (!acceptedTerms.value) {
    errorMessage.value = 'Kamu harus menyetujui Terms of Use & Privacy Policy'
    return
  }

  isSubmitting.value = true

  try {
    await authStore.register({
      name: name.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
      acceptedTerms: acceptedTerms.value,
    })

    // register sukses -> user diarahkan ke halaman verifikasi OTP
    router.push({ path: '/verify-email', query: { email: email.value } })
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Registrasi gagal, silakan coba lagi'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-16">
    <!-- LOGO -->
    <RouterLink to="/" class="text-2xl font-extrabold tracking-tight mb-6">
      Talita Cakes
    </RouterLink>

    <!-- HEADLINE -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-extrabold mb-2">Sign Up</h1>
      <div class="h-1 w-24 bg-gray-500 rounded-full mx-auto"></div>
    </div>

    <!-- CARD -->
    <div class="w-full max-w-md border border-gray-200 rounded-2xl p-8">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- NAME -->
        <div>
          <label for="name" class="block text-sm font-medium mb-1.5">Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Name"
            autocomplete="name"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <!-- EMAIL -->
        <div>
          <label for="email" class="block text-sm font-medium mb-1.5">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Email"
            autocomplete="email"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <!-- PHONE -->
        <div>
          <label for="phone" class="block text-sm font-medium mb-1.5">Phone</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="Phone"
            autocomplete="tel"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
            autocomplete="new-password"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <!-- CONFIRM PASSWORD -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium mb-1.5">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            autocomplete="new-password"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <!-- TERMS -->
        <label class="flex items-start gap-2 text-sm text-gray-600">
          <input
            v-model="acceptedTerms"
            type="checkbox"
            class="mt-0.5 rounded border-gray-300 focus:ring-gray-900"
          />
          <span>Saya menyetujui Terms of Use & Privacy Policy</span>
        </label>

        <!-- ERROR -->
        <p v-if="errorMessage" class="text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <!-- SUBMIT -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full border border-gray-900 bg-gray-900 text-white py-2.5 text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Signing up...' : 'Sign Up' }}
        </button>

        <!-- LOGIN LINK -->
        <p class="text-center text-sm text-gray-600">
          Already have an account?
          <RouterLink to="/login" class="font-bold text-gray-900 hover:underline">
            Login
          </RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>