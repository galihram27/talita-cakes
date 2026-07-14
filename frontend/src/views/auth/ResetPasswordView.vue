<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/lib/api'
import logo from '@/assets/images/logo.png'

const { t } = useI18n()
const router = useRouter()

// email + code dikirim dari halaman lupa password lewat history state
// (bukan query string, biar kode OTP tidak nempel di URL)
const email = ref('')
const code = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
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
  if (password.length < 6) return t('auth.reset.minLength')
  if (password.length > 20) return t('auth.reset.maxLength')
  if (!/^[A-Za-z]/.test(password)) return t('auth.reset.startWithLetter')
  if (!/\d/.test(password)) return t('auth.reset.needNumber')
  return null
}

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = t('auth.reset.allRequired')
    return
  }

  const passwordError = validatePassword(newPassword.value)
  if (passwordError) {
    errorMessage.value = passwordError
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = t('auth.reset.mismatch')
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
      err.response?.data?.message || t('auth.reset.failed')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="tc-page min-h-screen bg-[#FDF2F7] flex flex-col items-center justify-start px-5 pt-12 pb-20">
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
      <!-- SUKSES -->
      <div v-if="isSuccess" class="text-center flex flex-col gap-3">
        <div
          class="bg-[#E9F6EE] border border-[#C9E7D6] text-[#2E9E6B] rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold"
        >
          {{ t('auth.reset.success') }}
        </div>
        <RouterLink
          to="/login"
          class="text-sm font-extrabold text-brand-500 hover:opacity-70"
        >
          {{ t('auth.reset.signInNow') }}
        </RouterLink>
      </div>

      <!-- FORM -->
      <form v-else @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <div>
          <h1 class="font-display text-[28px] mb-1.5">{{ t('auth.reset.title') }}</h1>
          <p class="text-[#6E5A4D] text-[14.5px]">
            {{ t('auth.reset.subtitle1') }}
            <strong class="text-cocoa-900">{{ email }}</strong>
          </p>
        </div>

        <div>
          <label for="newPassword" class="block font-extrabold text-[13.5px] mb-1.5">
            {{ t('auth.reset.newPassword') }}
          </label>
          <div class="relative">
            <input
              id="newPassword"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              :placeholder="t('auth.reset.newPasswordPlaceholder')"
              autocomplete="new-password"
              class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white pl-4 pr-11 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              :aria-label="showNewPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
              :aria-pressed="showNewPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#B7A18E] hover:text-cocoa-900"
            >
              <svg v-if="!showNewPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            </button>
          </div>
          <p class="mt-1.5 text-xs text-cocoa-400">
            {{ t('auth.reset.passwordRules') }}
          </p>
        </div>

        <div>
          <label for="confirmPassword" class="block font-extrabold text-[13.5px] mb-1.5">
            {{ t('auth.register.confirmPassword') }}
          </label>
          <div class="relative">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="t('auth.reset.confirmPasswordPlaceholder')"
              autocomplete="new-password"
              class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white pl-4 pr-11 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              :aria-label="showConfirmPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
              :aria-pressed="showConfirmPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#B7A18E] hover:text-cocoa-900"
            >
              <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            </button>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="bg-[#FBE9E7] border border-[#F0C9C4] text-brand-500 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full bg-brand-500 text-white py-3.5 text-[15px] font-extrabold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? t('auth.reset.saving') : t('auth.reset.save') }}
        </button>
      </form>
    </div>
  </div>
</template>
