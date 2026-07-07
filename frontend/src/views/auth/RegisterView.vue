<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import logo from '@/assets/images/logo.png'

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
      <h1 class="font-display text-[28px] mb-6">Create account</h1>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <!-- NAME -->
        <div>
          <label for="name" class="block font-extrabold text-[13.5px] mb-1.5">Full name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Your name"
            autocomplete="name"
            class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
          />
        </div>

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

        <!-- PHONE -->
        <div>
          <label for="phone" class="block font-extrabold text-[13.5px] mb-1.5">
            Phone (active WhatsApp)
          </label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            autocomplete="tel"
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
            placeholder="At least 6 characters"
            autocomplete="new-password"
            class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
          />
        </div>

        <!-- CONFIRM PASSWORD -->
        <div>
          <label for="confirmPassword" class="block font-extrabold text-[13.5px] mb-1.5">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            autocomplete="new-password"
            class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
          />
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
            I agree to the
            <span class="text-brand-500 font-bold">Terms &amp; Conditions</span>
            and
            <span class="text-brand-500 font-bold">Privacy Policy</span>
            Talita's Cake.
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
          {{ isSubmitting ? 'Signing up...' : 'Sign up & send verification code' }}
        </button>
      </form>

      <!-- LOGIN LINK -->
      <p class="border-t border-cream-200 mt-5 pt-4 text-center text-sm text-[#6E5A4D]">
        Already have an account?
        <RouterLink to="/login" class="font-extrabold text-brand-500 hover:opacity-70">
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>