<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/lib/api'
import logo from '@/assets/images/logo.png'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

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

onMounted(() => {
  email.value = route.query.email || ''
  // akses langsung tanpa email -> balik ke register
  if (!email.value) router.replace({ name: 'register' })
  // OTP baru saja dikirim saat register — mulai cooldown
  startResendCooldown()
})

onUnmounted(() => clearInterval(cooldownTimer))

const handleVerify = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (code.value.length !== 6) {
    errorMessage.value = t('auth.forgot.otpLength')
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/auth/verify-email', {
      email: email.value,
      code: code.value,
    })
    // verifikasi sukses -> arahkan ke login
    router.push({ name: 'login' })
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('auth.forgot.otpWrong')
  } finally {
    isSubmitting.value = false
  }
}

const handleResend = async () => {
  if (resendCooldown.value > 0 || isSubmitting.value) return
  errorMessage.value = ''
  infoMessage.value = ''

  isSubmitting.value = true
  try {
    const { data } = await api.post('/auth/resend-otp', {
      email: email.value,
      purpose: 'EMAIL_VERIFICATION',
    })
    infoMessage.value = data.message || t('auth.verify.newCodeSent')
    startResendCooldown()
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || t('auth.forgot.resendFailed')
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
      <h1 class="font-display text-[28px] mb-1.5">{{ t('auth.verify.title') }}</h1>
      <p class="text-[#6E5A4D] text-[14.5px] mb-6">
        {{ t('auth.forgot.otpSubtitle1') }}
        <strong class="text-cocoa-900">{{ email }}</strong
        >{{ t('auth.forgot.otpSubtitle2') }}
      </p>

      <form @submit.prevent="handleVerify" class="flex flex-col gap-3.5">
        <input
          v-model="code"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="______"
          autocomplete="one-time-code"
          class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-[15px] text-[26px] tracking-[0.5em] text-center font-extrabold text-cocoa-900 placeholder-[#B7A18E]"
        />

        <div
          v-if="infoMessage"
          class="bg-[#E9F6EE] border border-[#C9E7D6] text-[#2E9E6B] rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold"
        >
          {{ infoMessage }}
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
          {{ isSubmitting ? t('auth.forgot.verifying') : t('auth.forgot.verify') }}
        </button>

        <button
          type="button"
          @click="handleResend"
          :disabled="resendCooldown > 0 || isSubmitting"
          class="text-brand-500 font-bold text-[13.5px] p-1 hover:opacity-70 disabled:text-cocoa-400 disabled:cursor-not-allowed"
        >
          {{ resendCooldown > 0 ? t('auth.forgot.resendWithCooldown', { s: resendCooldown }) : t('auth.forgot.resend') }}
        </button>
      </form>
    </div>
  </div>
</template>
