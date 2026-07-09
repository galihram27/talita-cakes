<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GoogleReviews from '@/components/common/GoogleReviews.vue'
import logo from '@/assets/images/logo.png'
import whatsappIcon from '@/assets/images/whatsapp-logo-png-2290.png'
import instagramIcon from '@/assets/images/instagram-icon-33470.png'
import threadsIcon from '@/assets/images/threads-logo-42594.png'
import tiktokIcon from '@/assets/images/tik-tok-logo-33095.png'
import addressIcon from '@/assets/images/pin-21504.png'
import { STORE_INFO } from '@/config/constants'

const { t } = useI18n()

const stats = computed(() => [
  { num: '12+', label: t('about.stats.years') },
  { num: '3000+', label: t('about.stats.cakes') },
  { num: t('about.stats.madeNum'), label: t('about.stats.made') },
])
</script>

<template>
  <div class="tc-page max-w-[1080px] mx-auto px-5 md:px-8 pt-14 pb-20">
    <!-- HERO -->
    <div class="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-7 md:gap-11 items-center mb-14">
      <div>
        <h1 class="font-display text-[clamp(36px,5vw,46px)] leading-[1.08] mb-4">
          {{ t('about.heading1') }} <br />
          {{ t('about.heading2') }} <span class="italic text-brand-500">{{ t('about.heading3') }}</span>
        </h1>
        <p class="font-display text-xl leading-normal text-cocoa-900 mb-4">
          {{ t('about.tagline') }}
        </p>
        <p class="text-[15.5px] leading-relaxed text-[#6E5A4D] mb-3.5">
          {{ t('about.intro1', { since: STORE_INFO.since }) }}
        </p>
        <p class="text-[15.5px] leading-relaxed text-[#6E5A4D]">
          {{ t('about.intro2') }}
        </p>
      </div>
      <div class="relative flex items-center justify-center py-6">
        <div
          class="absolute inset-0 m-auto w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle_at_50%_40%,#FBEFEC_0%,#F5E4DA_70%,transparent_100%)]"
        ></div>
        <div
          class="relative w-[260px] h-[260px] rounded-full bg-white border border-cream-300 shadow-[0_18px_44px_rgba(185,58,60,0.12)] flex items-center justify-center"
        >
          <img
            :src="logo"
            alt="Talita's Cake"
            class="w-40 h-40 object-contain"
          />
        </div>
      </div>
    </div>

    <!-- STAT BAND -->
    <div
      class="grid grid-cols-1 sm:grid-cols-3 bg-white border border-cream-300 rounded-[20px] overflow-hidden mb-8 shadow-[0_6px_22px_rgba(51,38,31,0.05)]"
    >
      <div
        v-for="(st, i) in stats"
        :key="st.label"
        class="px-5 py-6 text-center border-cream-200"
        :class="i < stats.length - 1 ? 'border-b sm:border-b-0 sm:border-r' : ''"
      >
        <div class="font-display text-[34px] text-brand-500 leading-none">{{ st.num }}</div>
        <div class="mt-2 text-[13px] font-bold text-[#6E5A4D]">{{ st.label }}</div>
      </div>
    </div>

    <!-- CERITA -->
    <div class="bg-[#FBF3EA] border border-cream-300 rounded-[20px] p-6 md:p-8 mb-11">
      <div class="text-[#6E5A4D] text-[15.5px] leading-[1.8] max-w-[760px] mx-auto">
        <p class="mb-3.5">
          {{ t('about.story1') }}
        </p>
        <p class="mb-3.5">
          {{ t('about.story2') }}
        </p>
        <p class="font-display text-xl text-brand-500 text-center">
          {{ t('about.storyClosing', { since: STORE_INFO.since }) }}
        </p>
      </div>
    </div>

    <!-- KONTAK -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <a
        v-if="STORE_INFO.whatsappNumber"
        :href="`https://wa.me/${STORE_INFO.whatsappNumber}`"
        target="_blank"
        rel="noopener"
        class="flex flex-col gap-2 bg-white border border-cream-300 rounded-2xl p-5 text-cocoa-900 hover:border-brand-500 transition-colors"
      >
        <span class="w-11 h-11 flex items-center justify-center">
          <img :src="whatsappIcon" alt="WhatsApp" class="w-6 h-6 object-contain" />
        </span>
        <span class="text-xs font-extrabold tracking-widest uppercase text-cocoa-400">
          WhatsApp
        </span>
        <span class="font-bold text-[15px] leading-normal">
          +{{ STORE_INFO.whatsappNumber }}
        </span>
      </a>
      <a
        v-if="STORE_INFO.instagram"
        :href="`https://instagram.com/${STORE_INFO.instagram}`"
        target="_blank"
        rel="noopener"
        class="flex flex-col gap-2 bg-white border border-cream-300 rounded-2xl p-5 text-cocoa-900 hover:border-brand-500 transition-colors"
      >
        <span class="w-11 h-11 flex items-center justify-center">
          <img :src="instagramIcon" alt="Instagram" class="w-6 h-6 object-contain" />
        </span>
        <span class="text-xs font-extrabold tracking-widest uppercase text-cocoa-400">
          Instagram
        </span>
        <span class="font-bold text-[15px] leading-normal">
          @{{ STORE_INFO.instagram }}
        </span>
      </a>
      <a
        v-if="STORE_INFO.threads"
        :href="`https://threads.net/@${STORE_INFO.threads}`"
        target="_blank"
        rel="noopener"
        class="flex flex-col gap-2 bg-white border border-cream-300 rounded-2xl p-5 text-cocoa-900 hover:border-brand-500 transition-colors"
      >
        <span class="w-11 h-11 flex items-center justify-center">
          <img :src="threadsIcon" alt="Threads" class="w-6 h-6 object-contain" />
        </span>
        <span class="text-xs font-extrabold tracking-widest uppercase text-cocoa-400">
          Threads
        </span>
        <span class="font-bold text-[15px] leading-normal">
          @{{ STORE_INFO.threads }}
        </span>
      </a>
      <a
        v-if="STORE_INFO.tiktok"
        :href="`https://tiktok.com/@${STORE_INFO.tiktok}`"
        target="_blank"
        rel="noopener"
        class="flex flex-col gap-2 bg-white border border-cream-300 rounded-2xl p-5 text-cocoa-900 hover:border-brand-500 transition-colors"
      >
        <span class="w-11 h-11 flex items-center justify-center">
          <img :src="tiktokIcon" alt="TikTok" class="w-6 h-6 object-contain" />
        </span>
        <span class="text-xs font-extrabold tracking-widest uppercase text-cocoa-400">
          TikTok
        </span>
        <span class="font-bold text-[15px] leading-normal">
          @{{ STORE_INFO.tiktok }}
        </span>
      </a>
      <div
        v-if="STORE_INFO.address"
        class="flex flex-col gap-2 bg-white border border-cream-300 rounded-2xl p-5 text-cocoa-900"
      >
        <span class="w-11 h-11 flex items-center justify-center">
          <img :src="addressIcon" alt="Store" class="w-6 h-6 object-contain" />
        </span>
        <span class="text-xs font-extrabold tracking-widest uppercase text-cocoa-400">
          {{ t('about.store') }}
        </span>
        <span class="font-bold text-[15px] leading-normal">
          {{ STORE_INFO.address }}
        </span>
      </div>
    </div>

    <!-- REVIEWS -->
    <div class="mt-14">
      <GoogleReviews />
    </div>
  </div>
</template>
