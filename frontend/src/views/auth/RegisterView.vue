<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import logo from '@/assets/images/logo.png'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptedTerms = ref(false)

const errorMessage = ref('')
const isSubmitting = ref(false)

// error per-field, ditandai "touched" setelah user meninggalkan input (blur)
const touched = ref({
  name: false,
  email: false,
  phone: false,
  password: false,
  confirmPassword: false,
})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// No. HP Indonesia: diawali 0 atau +62, 9–15 digit
const PHONE_REGEX = /^(\+62|0)8[1-9][0-9]{6,12}$/

const nameError = computed(() => {
  if (!touched.value.name) return ''
  if (!name.value.trim()) return t('auth.register.nameRequired')
  return ''
})

const emailError = computed(() => {
  if (!touched.value.email) return ''
  const value = email.value.trim()
  if (!value) return t('auth.register.emailRequired')
  if (!EMAIL_REGEX.test(value)) return t('auth.register.emailInvalid')
  return ''
})

const phoneError = computed(() => {
  if (!touched.value.phone) return ''
  const value = phone.value.trim()
  if (!value) return t('auth.register.phoneRequired')
  if (!PHONE_REGEX.test(value)) return t('auth.register.phoneInvalid')
  return ''
})

const passwordError = computed(() => {
  if (!touched.value.password) return ''
  if (!password.value) return t('auth.register.passwordRequired')
  if (password.value.length < 6) return t('auth.register.passwordMin')
  return ''
})

const confirmPasswordError = computed(() => {
  if (!touched.value.confirmPassword) return ''
  if (!confirmPassword.value) return t('auth.register.confirmRequired')
  if (confirmPassword.value !== password.value) return t('auth.register.passwordMismatch')
  return ''
})

const handleSubmit = async () => {
  errorMessage.value = ''

  // tandai semua field sebagai touched supaya error langsung tampil saat submit
  touched.value = {
    name: true,
    email: true,
    phone: true,
    password: true,
    confirmPassword: true,
  }

  if (
    nameError.value ||
    emailError.value ||
    phoneError.value ||
    passwordError.value ||
    confirmPasswordError.value
  ) {
    return
  }

  if (!acceptedTerms.value) {
    errorMessage.value = t('auth.register.mustAcceptTerms')
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
    const serverMessage = err.response?.data?.message
    // Email sudah dipakai (pesan backend berbahasa Indonesia) -> tampilkan
    // versi terlokalisasi sesuai bahasa aktif, bukan pesan mentah backend.
    if (serverMessage === 'Email sudah terdaftar') {
      errorMessage.value = t('auth.register.emailTaken')
    } else {
      errorMessage.value = serverMessage || t('auth.register.failed')
    }
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
      <h1 class="font-display text-[28px] mb-6">{{ t('auth.register.title') }}</h1>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <!-- NAME -->
        <div>
          <label for="name" class="block font-extrabold text-[13.5px] mb-1.5">{{ t('auth.register.name') }}</label>
          <input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('auth.register.namePlaceholder')"
            autocomplete="name"
            @blur="touched.name = true"
            :aria-invalid="!!nameError"
            :class="[
              'w-full rounded-xl border-[1.5px] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
              nameError ? 'border-brand-500' : 'border-[#E4D3C1]',
            ]"
          />
          <p v-if="nameError" class="mt-1.5 text-brand-500 text-[12.5px] font-bold">
            {{ nameError }}
          </p>
        </div>

        <!-- EMAIL -->
        <div>
          <label for="email" class="block font-extrabold text-[13.5px] mb-1.5">{{ t('auth.login.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('auth.login.emailPlaceholder')"
            autocomplete="email"
            @blur="touched.email = true"
            :aria-invalid="!!emailError"
            :class="[
              'w-full rounded-xl border-[1.5px] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
              emailError ? 'border-brand-500' : 'border-[#E4D3C1]',
            ]"
          />
          <p v-if="emailError" class="mt-1.5 text-brand-500 text-[12.5px] font-bold">
            {{ emailError }}
          </p>
        </div>

        <!-- PHONE -->
        <div>
          <label for="phone" class="block font-extrabold text-[13.5px] mb-1.5">
            {{ t('auth.register.phone') }}
          </label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            autocomplete="tel"
            @blur="touched.phone = true"
            :aria-invalid="!!phoneError"
            :class="[
              'w-full rounded-xl border-[1.5px] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
              phoneError ? 'border-brand-500' : 'border-[#E4D3C1]',
            ]"
          />
          <p v-if="phoneError" class="mt-1.5 text-brand-500 text-[12.5px] font-bold">
            {{ phoneError }}
          </p>
        </div>

        <!-- PASSWORD -->
        <div>
          <label for="password" class="block font-extrabold text-[13.5px] mb-1.5">{{ t('auth.login.password') }}</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('auth.register.passwordPlaceholder')"
              autocomplete="new-password"
              @blur="touched.password = true"
              :aria-invalid="!!passwordError"
              :class="[
                'w-full rounded-xl border-[1.5px] bg-white pl-4 pr-11 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
                passwordError ? 'border-brand-500' : 'border-[#E4D3C1]',
              ]"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
              :aria-pressed="showPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#B7A18E] hover:text-cocoa-900"
            >
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <p v-if="passwordError" class="mt-1.5 text-brand-500 text-[12.5px] font-bold">
            {{ passwordError }}
          </p>
        </div>

        <!-- CONFIRM PASSWORD -->
        <div>
          <label for="confirmPassword" class="block font-extrabold text-[13.5px] mb-1.5">
            {{ t('auth.register.confirmPassword') }}
          </label>
          <div class="relative">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="t('auth.register.confirmPasswordPlaceholder')"
              autocomplete="new-password"
              @blur="touched.confirmPassword = true"
              :aria-invalid="!!confirmPasswordError"
              :class="[
                'w-full rounded-xl border-[1.5px] bg-white pl-4 pr-11 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
                confirmPasswordError ? 'border-brand-500' : 'border-[#E4D3C1]',
              ]"
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
          <p v-if="confirmPasswordError" class="mt-1.5 text-brand-500 text-[12.5px] font-bold">
            {{ confirmPasswordError }}
          </p>
        </div>

        <!-- TERMS -->
        <label
          class="flex items-start gap-2.5 text-[13px] text-[#6E5A4D] leading-relaxed cursor-pointer"
        >
          <input
            v-model="acceptedTerms"
            type="checkbox"
            class="mt-0.5 w-4 h-4 accent-brand-500"
          />
          <span>
            {{ t('auth.register.terms1') }}
            <RouterLink
              :to="{ name: 'terms' }"
              target="_blank"
              @click.stop
              class="text-brand-500 font-bold hover:underline"
            >{{ t('auth.register.termsConditions') }}</RouterLink>
            {{ t('auth.register.terms2') }}
            <RouterLink
              :to="{ name: 'privacy' }"
              target="_blank"
              @click.stop
              class="text-brand-500 font-bold hover:underline"
            >{{ t('auth.register.privacyPolicy') }}</RouterLink>
            {{ t('auth.register.terms3') }}
          </span>
        </label>

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
          {{ isSubmitting ? t('auth.register.submitting') : t('auth.register.submit') }}
        </button>
      </form>

      <!-- LOGIN LINK -->
      <p class="border-t border-cream-200 mt-5 pt-4 text-center text-sm text-[#6E5A4D]">
        {{ t('auth.register.haveAccount') }}
        <RouterLink to="/login" class="font-extrabold text-brand-500 hover:opacity-70">
          {{ t('auth.register.signIn') }}
        </RouterLink>
      </p>
    </div>
  </div>
</template>