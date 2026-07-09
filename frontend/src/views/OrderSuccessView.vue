<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check } from 'lucide-vue-next'

const router = useRouter()

// whatsappLink & orderId dikirim dari CheckoutView via history.state saat
// order dibuat. Kalau halaman ini dibuka langsung / di-refresh, state hilang —
// kita tetap tampilkan pesan sukses generik tanpa tombol WhatsApp.
const state = window.history.state || {}
const whatsappLink = ref(state.whatsappLink || '')
const orderId = ref(state.orderId || '')

const orderCode = orderId.value
  ? orderId.value.slice(0, 8).toUpperCase()
  : ''
</script>

<template>
  <div class="tc-page max-w-[560px] mx-auto px-8 py-20 text-center">
    <div
      class="w-20 h-20 rounded-full bg-[#EDF6EF] border border-[#CDE3D2] flex items-center justify-center mx-auto mb-6"
    >
      <Check class="w-10 h-10 text-[#3E7A4E]" stroke-width="3" />
    </div>

    <h1 class="font-display text-[32px] mb-3">{{ $t('orderSuccess.title') }}</h1>
    <p class="text-[#6E5A4D] text-[15px] leading-relaxed mb-2">
      {{ $t('orderSuccess.desc') }}
    </p>
    <p v-if="orderCode" class="text-cocoa-400 text-sm mb-7">
      {{ $t('orderSuccess.orderNo') }}
      <strong class="text-cocoa-900">#{{ orderCode }}</strong>
    </p>
    <div v-else class="mb-7"></div>

    <div class="flex flex-col gap-3">
      <a
        v-if="whatsappLink"
        :href="whatsappLink"
        class="inline-flex items-center justify-center bg-brand-500 text-white font-extrabold text-[15px] px-7 py-3.5 rounded-full hover:bg-brand-600 transition-colors"
      >
        {{ $t('orderSuccess.reopenWhatsApp') }}
      </a>
      <RouterLink
        to="/menu"
        class="inline-flex items-center justify-center font-extrabold text-[15px] px-7 py-3.5 rounded-full border-2 border-[#EBDCCC] text-cocoa-900 hover:border-brand-500 transition-colors"
        :class="whatsappLink ? '' : 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600'"
      >
        {{ $t('orderSuccess.backToMenu') }}
      </RouterLink>
    </div>
  </div>
</template>
