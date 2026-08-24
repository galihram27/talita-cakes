<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check } from 'lucide-vue-next'

const router = useRouter()

// Data pesanan dititipkan halaman checkout lewat history.state, bukan lewat
// alamat URL, supaya nomor pesanan dan link WhatsApp tidak terlihat di address
// bar. Diberi "|| {}" sebagai pengaman kalau halaman ini dibuka langsung.
const state = window.history.state || {}
const whatsappLink = ref(state.whatsappLink || '')
const orderId = ref(state.orderId || '')

// Id pesanan aslinya panjang, jadi yang ditunjukkan ke pembeli hanya 8 huruf
// pertama dalam huruf besar supaya mudah dibaca dan disebutkan.
const orderCode = orderId.value ? orderId.value.slice(0, 8).toUpperCase() : ''
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
    <!-- Kotak kosong pengganti nomor pesanan supaya jarak antar bagian
         tetap sama walaupun nomornya tidak ada. -->
    <div v-else class="mb-7"></div>

    <div class="flex flex-col gap-3">
      <a
        v-if="whatsappLink"
        :href="whatsappLink"
        class="inline-flex items-center justify-center bg-brand-500 text-white font-extrabold text-[15px] px-7 py-3.5 rounded-full hover:bg-brand-600 transition-colors"
      >
        {{ $t('orderSuccess.reopenWhatsApp') }}
      </a>
      <!-- Tombol ini berubah tampilan sesuai keadaan: kalau tombol WhatsApp ada,
           bentuknya tombol pinggiran saja; kalau tidak ada, dia yang menjadi
           tombol utama berwarna penuh. -->
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
