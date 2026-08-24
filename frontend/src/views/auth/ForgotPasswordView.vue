<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/lib/api'
import logo from '@/assets/images/logo.png'

const { t } = useI18n()
const router = useRouter()

// Halaman ini punya dua tampilan yang bergantian dalam satu file: mengisi email
// ('email'), lalu memasukkan kode OTP ('otp'). Nilai step inilah yang menentukan
// form mana yang ditampilkan, jadi tidak perlu dibuat dua halaman terpisah.
const step = ref('email')

const email = ref('')
const code = ref('')
const errorMessage = ref('')
const infoMessage = ref('')
const isSubmitting = ref(false)

// Hitung mundur agar tombol "kirim ulang" tidak bisa ditekan terus-menerus.
// Timer-nya disimpan di variabel biasa, bukan ref, karena nilainya tidak
// perlu ditampilkan di layar — yang ditampilkan hanya angka resendCooldown.
const resendCooldown = ref(0)
let cooldownTimer = null

const startResendCooldown = () => {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

// Timer wajib dimatikan saat halaman ditinggalkan, kalau tidak dia akan terus
// berjalan di belakang layar meski komponennya sudah tidak dipakai.
onUnmounted(() => clearInterval(cooldownTimer))

// Langkah 1: minta server mengirim kode OTP ke email, lalu pindah ke form OTP.
const handleSendOtp = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!email.value) {
    errorMessage.value = t('auth.forgot.emailRequired')
    return
  }

  isSubmitting.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    infoMessage.value = data.message
    step.value = 'otp'
    startResendCooldown()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('auth.forgot.sendFailed')
  } finally {
    isSubmitting.value = false
  }
}

// Kirim ulang kode. Isinya mirip handleSendOtp, bedanya tidak berpindah step
// karena pengunjung memang sudah berada di form OTP.
const handleResendOtp = async () => {
  // Pengaman tambahan selain tombol yang sudah dinonaktifkan di template.
  if (resendCooldown.value > 0 || isSubmitting.value) return
  errorMessage.value = ''
  infoMessage.value = ''

  isSubmitting.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    infoMessage.value = data.message
    startResendCooldown()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('auth.forgot.resendFailed')
  } finally {
    isSubmitting.value = false
  }
}

// Langkah 2: kirim kode OTP untuk dicek server. Kalau cocok, lanjut ke halaman
// ganti password baru.
const handleVerifyOtp = async () => {
  errorMessage.value = ''
  infoMessage.value = ''

  if (code.value.length !== 6) {
    errorMessage.value = t('auth.forgot.otpLength')
    return
  }

  isSubmitting.value = true
  try {
    await api.post('/auth/verify-reset-otp', {
      email: email.value,
      code: code.value,
    })

    // Email dan kode dikirim lewat state, bukan query di alamat URL, supaya
    // keduanya tidak terlihat di address bar dan tidak ikut tersimpan
    // di riwayat browser.
    router.push({
      name: 'reset-password',
      state: { email: email.value, code: code.value },
    })
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('auth.forgot.otpWrong')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    class="tc-page min-h-screen bg-[#FDF2F7] flex flex-col items-center justify-start px-5 pt-12 pb-20"
  >
    <RouterLink to="/" class="flex flex-col items-center gap-3 mb-6">
      <img :src="logo" alt="Logo Talita's Cake & Cupcakes" class="h-20 w-20 object-contain" />
      <span class="font-display text-2xl text-cocoa-900"> Talita's Cake &amp; Cupcakes </span>
    </RouterLink>

    <div class="w-full max-w-[440px] bg-white border border-cream-300 rounded-[20px] p-8 pb-7">
      <!-- Form langkah 1: minta email. Muncul selama step masih 'email'. -->
      <form v-if="step === 'email'" @submit.prevent="handleSendOtp" class="flex flex-col gap-3.5">
        <div>
          <h1 class="font-display text-[28px] mb-1.5">{{ t('auth.forgot.title') }}</h1>
          <p class="text-[#6E5A4D] text-[14.5px]">
            {{ t('auth.forgot.subtitle') }}
          </p>
        </div>

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
            class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
          />
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
          {{ isSubmitting ? t('auth.forgot.sending') : t('auth.forgot.sendCode') }}
        </button>

        <RouterLink
          to="/login"
          class="text-center text-[#6E5A4D] font-bold text-[13.5px] p-1 hover:text-brand-500 transition-colors"
        >
          {{ t('auth.forgot.backToSignIn') }}
        </RouterLink>
      </form>

      <!-- Form langkah 2: isi kode OTP. Ditulis pakai v-else, jadi otomatis
           menggantikan form di atas begitu step berubah jadi 'otp'. -->
      <form v-else @submit.prevent="handleVerifyOtp" class="flex flex-col gap-3.5">
        <div>
          <h1 class="font-display text-[28px] mb-1.5">{{ t('auth.forgot.otpTitle') }}</h1>
          <p class="text-[#6E5A4D] text-[14.5px]">
            {{ t('auth.forgot.otpSubtitle1') }}
            <strong class="text-cocoa-900">{{ email }}</strong
            >{{ t('auth.forgot.otpSubtitle2') }}
          </p>
        </div>

        <!-- inputmode="numeric" memunculkan papan ketik angka di HP, maxlength
             membatasi 6 digit, dan autocomplete="one-time-code" membuat kode
             dari SMS/email bisa diisi otomatis. -->
        <input
          id="code"
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

        <!-- Tombol kirim ulang. Selama hitung mundur belum habis tombolnya mati
             dan tulisannya menampilkan sisa detik. -->
        <button
          type="button"
          @click="handleResendOtp"
          :disabled="resendCooldown > 0 || isSubmitting"
          class="text-brand-500 font-bold text-[13.5px] p-1 hover:opacity-70 disabled:text-cocoa-400 disabled:cursor-not-allowed"
        >
          {{
            resendCooldown > 0
              ? t('auth.forgot.resendWithCooldown', { s: resendCooldown })
              : t('auth.forgot.resend')
          }}
        </button>

        <!-- Kembali ke langkah 1 kalau emailnya ternyata salah ketik.
             Pesan lama ikut dikosongkan supaya tidak tertinggal di layar.
             CATATAN: @click di bawah harus tetap satu baris dengan titik koma.
             Kalau dipecah jadi beberapa baris (mis. oleh Prettier), Vue gagal
             membacanya dan proses build ikut gagal. -->
        <!-- prettier-ignore -->
        <button
          type="button"
          @click="step = 'email'; errorMessage = ''; infoMessage = ''"
          class="text-[#6E5A4D] font-bold text-[13.5px] p-1 hover:text-brand-500 transition-colors"
        >
          {{ t('auth.forgot.changeEmail') }}
        </button>
      </form>
    </div>
  </div>
</template>
