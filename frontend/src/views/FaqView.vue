<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown } from 'lucide-vue-next'
import { usePageSeo } from '@/composables/usePageSeo'

const { t, tm, rt } = useI18n()

usePageSeo({
  title: 'FAQ',
  description:
    "Pertanyaan umum seputar pemesanan, pre-order, pengiriman, dan pembayaran di Talita's Cake & Cupcakes.",
  path: '/faq',
})

// index item yang sedang terbuka (-1 = semua tertutup)
const openIndex = ref(-1)
const toggle = (i) => (openIndex.value = openIndex.value === i ? -1 : i)
</script>

<template>
  <div class="tc-page max-w-[820px] mx-auto px-5 md:px-8 pt-14 pb-20">
    <!-- HEADER -->
    <div class="mb-10">
      <h1 class="font-display text-[clamp(32px,5vw,42px)] leading-[1.1] mb-3">
        {{ t('faq.title') }}
      </h1>
      <p class="text-[15.5px] leading-relaxed text-[#6E5A4D]">
        {{ t('faq.intro') }}
      </p>
    </div>

    <!-- ITEMS -->
    <div class="flex flex-col gap-3">
      <div
        v-for="(item, i) in tm('faq.items')"
        :key="i"
        class="bg-white border border-cream-300 rounded-2xl overflow-hidden transition-colors"
        :class="openIndex === i ? 'border-brand-500' : ''"
      >
        <button
          type="button"
          @click="toggle(i)"
          class="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
          :aria-expanded="openIndex === i"
        >
          <span class="font-bold text-[15.5px] text-cocoa-900 leading-snug">
            {{ rt(item.q) }}
          </span>
          <ChevronDown
            class="w-5 h-5 shrink-0 text-brand-500 transition-transform"
            :class="openIndex === i ? 'rotate-180' : ''"
            stroke-width="2.2"
          />
        </button>
        <div v-if="openIndex === i" class="px-5 pb-5 -mt-1">
          <p class="text-[15px] leading-[1.8] text-[#6E5A4D] whitespace-pre-line">
            {{ rt(item.a) }}
          </p>
        </div>
      </div>
    </div>

    <!-- CONTACT CTA -->
    <div
      class="mt-10 bg-[#FBF3EA] border border-cream-300 rounded-[20px] p-6 md:p-7 text-center"
    >
      <p class="font-display text-xl text-cocoa-900 mb-1">
        {{ t('faq.stillQuestions') }}
      </p>
      <p class="text-[14.5px] leading-relaxed text-[#6E5A4D]">
        {{ t('faq.contactNote') }}
      </p>
    </div>
  </div>
</template>
