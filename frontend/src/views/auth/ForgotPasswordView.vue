<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '@/lib/api'
import logo from '@/assets/images/logo.jpeg'

const router = useRouter()

// step: 'email' (kirim OTP) -> 'otp' (isi kode)
const step = ref('email')

const email = ref('')
const code = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const isSubmitting = ref(false)

// Cooldown kirim ulang OTP (samakan dengan cooldown backend: 60 detik)
const resendCooldown = ref(0)
let cooldownTimer = null

const startResendCooldown = () => {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(cooldownTimer))

// STEP 1: kirim OTP ke email
const handleSendOtp = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!email.value) {
    errorMessage.value = 'Email wajib diisi'
    return
  }

  isSubmitting.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    infoMessage.value = data.message
    step.value = 'otp'
    startResendCooldown()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal mengirim kode OTP'
  } finally {
    isSubmitting.value = false
  }
}

// Kirim ulang OTP (dari step 2)
const handleResendOtp = async () => {
  if (resendCooldown.value > 0 || isSubmitting.value) return
  errorMessage.value = ''
  infoMessage.value = ''

  isSubmitting.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    infoMessage.value = data.message
    startResendCooldown()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal mengirim ulang kode OTP'
  } finally {
    isSubmitting.value = false
  }
}

// STEP 2: verifikasi OTP, lalu lanjut ke halaman atur password baru
const handleVerifyOtp = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (code.value.length !== 6) {
    errorMessage.value = 'Kode OTP harus 6 digit'
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/auth/verify-reset-otp', {
      email: email.value,
      code: code.value,
    })

    // Bawa email + code lewat history state (tidak muncul di URL)
    router.push({
      name: 'reset-password',
      state: { email: email.value, code: code.value },
    })
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Kode OTP salah'
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
      <h1 class="text-3xl font-extrabold mb-2">Lupa Password</h1>
      <p class="text-sm text-gray-600">
        Tenang, kami bantu pulihkan akunmu.
      </p>
    </div>

    <!-- CARD -->
    <div class="w-full max-w-md border border-gray-200 rounded-2xl p-8">
      <!-- STEP 1: EMAIL -->
      <form v-if="step === 'email'" @submit.prevent="handleSendOtp" class="space-y-5">
        <p class="text-sm text-gray-600">
          Masukkan email akun kamu. Kami akan mengirimkan kode OTP untuk mengatur ulang password.
        </p>

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

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full border border-brand-600 bg-brand-600 text-white py-2.5 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Mengirim...' : 'Kirim Kode OTP' }}
        </button>

        <p class="text-center text-sm text-gray-600">
          Ingat password kamu?
          <RouterLink to="/login" class="font-bold text-brand-600 hover:underline">
            Sign In
          </RouterLink>
        </p>
      </form>

      <!-- STEP 2: OTP -->
      <form v-else @submit.prevent="handleVerifyOtp" class="space-y-5">
        <p class="text-sm text-gray-600">
          Masukkan kode OTP 6 digit yang dikirim ke
          <span class="font-semibold text-gray-900">{{ email }}</span>
        </p>

        <div>
          <label for="code" class="block text-sm font-medium mb-1.5">Kode OTP</label>
          <input
            id="code"
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="••••••"
            autocomplete="one-time-code"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-lg tracking-[0.5em] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <p v-if="infoMessage" class="text-sm text-green-600">{{ infoMessage }}</p>
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full border border-brand-600 bg-brand-600 text-white py-2.5 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Memeriksa...' : 'Verifikasi Kode' }}
        </button>

        <p class="text-center text-sm text-gray-600">
          Tidak menerima kode?
          <button
            type="button"
            @click="handleResendOtp"
            :disabled="resendCooldown > 0 || isSubmitting"
            class="font-bold text-brand-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
          >
            {{ resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : 'Kirim ulang' }}
          </button>
        </p>

        <p class="text-center text-sm text-gray-600">
          <button
            type="button"
            @click="step = 'email'; errorMessage = ''; infoMessage = ''"
            class="hover:underline"
          >
            Ganti email
          </button>
        </p>
      </form>
    </div>
  </div>
</template>
