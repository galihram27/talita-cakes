<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import logo from '@/assets/images/logo.png'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const cartStore = useCartStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

// error per-field, ditandai "touched" setelah user meninggalkan input (blur)
const emailTouched = ref(false)
const passwordTouched = ref(false)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailError = computed(() => {
  if (!emailTouched.value) return ''
  const value = email.value.trim()
  if (!value) return t('auth.login.emailRequired')
  if (!EMAIL_REGEX.test(value)) return t('auth.login.emailInvalid')
  return ''
})

const passwordError = computed(() => {
  if (!passwordTouched.value) return ''
  if (!password.value) return t('auth.login.passwordRequired')
  return ''
})

const handleSubmit = async () => {
  errorMessage.value = ''

  // tandai semua field sebagai touched supaya error langsung tampil saat submit
  emailTouched.value = true
  passwordTouched.value = true

  if (emailError.value || passwordError.value) {
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
      err.response?.data?.message || t('auth.login.failed')
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
      <h1 class="font-display text-[28px] mb-1.5">{{ t('auth.login.title') }}</h1>
      <p class="text-[#6E5A4D] text-[14.5px] mb-6">{{ t('auth.login.subtitle') }}</p>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <!-- EMAIL -->
        <div>
          <label for="email" class="block font-extrabold text-[13.5px] mb-1.5">{{ t('auth.login.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('auth.login.emailPlaceholder')"
            autocomplete="email"
            @blur="emailTouched = true"
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

        <!-- PASSWORD -->
        <div>
          <label for="password" class="block font-extrabold text-[13.5px] mb-1.5">{{ t('auth.login.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            @blur="passwordTouched = true"
            :aria-invalid="!!passwordError"
            :class="[
              'w-full rounded-xl border-[1.5px] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
              passwordError ? 'border-brand-500' : 'border-[#E4D3C1]',
            ]"
          />
          <p v-if="passwordError" class="mt-1.5 text-brand-500 text-[12.5px] font-bold">
            {{ passwordError }}
          </p>
          <p class="text-right mt-2">
            <RouterLink
              to="/forgot-password"
              class="text-brand-500 font-bold text-[13.5px] hover:opacity-70"
            >
              {{ t('auth.login.forgotPassword') }}
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
          {{ isSubmitting ? t('auth.login.submitting') : t('auth.login.submit') }}
        </button>
      </form>

      <!-- REGISTER LINK -->
      <p class="border-t border-cream-200 mt-5 pt-4 text-center text-sm text-[#6E5A4D]">
        {{ t('auth.login.noAccount') }}
        <RouterLink to="/register" class="font-extrabold text-brand-500 hover:opacity-70">
          {{ t('auth.login.signUp') }}
        </RouterLink>
      </p>
    </div>
  </div>
</template>