<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import api from '@/lib/api'
import logo from '@/assets/images/logo.jpeg'

const router = useRouter()

// email + code dikirim dari halaman lupa password lewat history state
// (bukan query string, biar kode OTP tidak nempel di URL)
const email = ref('')
const code = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)

onMounted(() => {
  email.value = history.state?.email || ''
  code.value = history.state?.code || ''

  // Akses langsung tanpa lewat verifikasi OTP -> balikin ke halaman lupa password
  if (!email.value || !code.value) {
    router.replace({ name: 'forgot-password' })
  }
})

const validatePassword = (password) => {
  if (password.length < 6) return 'Password minimal 6 karakter'
  if (password.length > 20) return 'Password maksimal 20 karakter'
  if (!/^[A-Za-z]/.test(password)) return 'Password harus diawali huruf'
  if (!/\d/.test(password)) return 'Password harus mengandung minimal 1 angka'
  return null
}

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = 'Semua field wajib diisi'
    return
  }

  const passwordError = validatePassword(newPassword.value)
  if (passwordError) {
    errorMessage.value = passwordError
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak sama'
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/auth/reset-password', {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })

    isSuccess.value = true
    setTimeout(() => router.push({ name: 'login' }), 2000)
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Gagal mengatur ulang password'
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
      <h1 class="text-3xl font-extrabold mb-2">Atur Password Baru</h1>
      <p class="text-sm text-gray-600">
        Satu langkah lagi — buat password baru untuk akunmu.
      </p>
    </div>

    <!-- CARD -->
    <div class="w-full max-w-md border border-gray-200 rounded-2xl p-8">
      <!-- SUKSES -->
      <div v-if="isSuccess" class="text-center space-y-3">
        <p class="text-sm text-green-600 font-semibold">
          Password berhasil diubah! Mengarahkan ke halaman login...
        </p>
        <RouterLink to="/login" class="text-sm font-bold text-brand-600 hover:underline">
          Sign In sekarang
        </RouterLink>
      </div>

      <!-- FORM -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-5">
        <p class="text-sm text-gray-600">
          Buat password baru untuk akun
          <span class="font-semibold text-gray-900">{{ email }}</span>
        </p>

        <div>
          <label for="newPassword" class="block text-sm font-medium mb-1.5">Password Baru</label>
          <input
            id="newPassword"
            v-model="newPassword"
            type="password"
            placeholder="Password baru"
            autocomplete="new-password"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <p class="mt-1.5 text-xs text-gray-500">
            6–20 karakter, diawali huruf, dan mengandung minimal 1 angka
          </p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium mb-1.5">
            Konfirmasi Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Ulangi password baru"
            autocomplete="new-password"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full border border-brand-600 bg-brand-600 text-white py-2.5 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru' }}
        </button>
      </form>
    </div>
  </div>
</template>
