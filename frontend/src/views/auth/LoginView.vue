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

// Isi input disimpan di ref supaya nilainya terhubung dua arah dengan v-model.
// isSubmitting dipakai untuk mengunci tombol agar tidak terkirim dua kali.
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')
const isSubmitting = ref(false)

// Penanda bahwa input pernah disentuh lalu ditinggalkan pengunjung. Tujuannya
// supaya pesan error tidak langsung muncul saat form baru dibuka dan masih kosong.
const emailTouched = ref(false)
const passwordTouched = ref(false)

// Pola sederhana untuk mengecek format email: ada teks, @, teks, titik, teks.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Pesan error dibuat pakai computed, jadi otomatis ikut berubah setiap kali
// isi input berubah tanpa perlu dipanggil manual.
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

  // Saat tombol ditekan, semua input dianggap sudah disentuh supaya error pada
  // input yang belum pernah diisi sekalipun ikut ditampilkan.
  emailTouched.value = true
  passwordTouched.value = true

  // Kalau masih ada yang salah, berhenti di sini dan jangan kirim ke server.
  if (emailError.value || passwordError.value) {
    return
  }

  isSubmitting.value = true

  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    })

    // Ambil ulang isi keranjang milik akun yang baru saja login,
    // supaya angka pada ikon keranjang langsung sesuai.
    cartStore.refresh()

    // Kalau tadi pengunjung dilempar ke sini karena membuka halaman yang butuh
    // login, alamat tujuannya tersimpan di query redirect dan dipakai kembali.
    // Kalau tidak ada, cukup kembali ke beranda.
    router.push(route.query.redirect || '/')
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('auth.login.failed')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    class="tc-page min-h-screen bg-[#FDF2F7] flex flex-col items-center justify-start px-5 pt-12 pb-20"
  >
    <!-- Logo sekaligus jalan pintas kembali ke beranda. -->
    <RouterLink to="/" class="flex flex-col items-center gap-3 mb-6">
      <img :src="logo" alt="Logo Talita's Cake & Cupcakes" class="h-20 w-20 object-contain" />
      <span class="font-display text-2xl text-cocoa-900"> Talita's Cake &amp; Cupcakes </span>
    </RouterLink>

    <div class="w-full max-w-[440px] bg-white border border-cream-300 rounded-[20px] p-8 pb-7">
      <h1 class="font-display text-[28px] text-center mb-6">{{ t('auth.login.title') }}</h1>

      <!-- .prevent menahan perilaku bawaan form yang me-reload halaman,
           jadi pengiriman data sepenuhnya ditangani handleSubmit. -->
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
        <!-- @blur menandai input sudah ditinggalkan, dan warna garis tepinya
             berubah merah lewat :class kalau isinya belum benar. -->
        <div>
          <label for="email" class="block font-extrabold text-[13.5px] mb-1.5">{{
            t('auth.login.email')
          }}</label>
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

        <div>
          <label for="password" class="block font-extrabold text-[13.5px] mb-1.5">{{
            t('auth.login.password')
          }}</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              @blur="passwordTouched = true"
              :aria-invalid="!!passwordError"
              :class="[
                'w-full rounded-xl border-[1.5px] bg-white pl-4 pr-11 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]',
                passwordError ? 'border-brand-500' : 'border-[#E4D3C1]',
              ]"
            />
            <!-- Tombol mata untuk memperlihatkan/menyembunyikan password:
                 nilai showPassword dibalik, lalu type input ikut berganti
                 antara "text" dan "password". Ikonnya juga bertukar (v-if/v-else). -->
            <button
              type="button"
              @click="showPassword = !showPassword"
              :aria-label="
                showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')
              "
              :aria-pressed="showPassword"
              class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#B7A18E] hover:text-cocoa-900"
            >
              <svg
                v-if="!showPassword"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                />
                <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            </button>
          </div>
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

        <!-- Kotak merah untuk pesan gagal dari server, misalnya password salah.
             Berbeda dengan error per input yang dicek di browser. -->
        <div
          v-if="errorMessage"
          class="bg-[#FBE9E7] border border-[#F0C9C4] text-brand-500 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold"
        >
          {{ errorMessage }}
        </div>

        <!-- Selama proses login berjalan tombol dinonaktifkan dan tulisannya
             berganti, supaya pengunjung tidak menekannya berkali-kali. -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-full bg-brand-500 text-white py-3.5 text-[15px] font-extrabold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? t('auth.login.submitting') : t('auth.login.submit') }}
        </button>
      </form>

      <p class="border-t border-cream-200 mt-5 pt-4 text-center text-sm text-[#6E5A4D]">
        {{ t('auth.login.noAccount') }}
        <RouterLink to="/register" class="font-extrabold text-brand-500 hover:opacity-70">
          {{ t('auth.login.signUp') }}
        </RouterLink>
      </p>
    </div>
  </div>
</template>
