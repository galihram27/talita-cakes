<script setup>
import { useI18n } from 'vue-i18n'
import { usePageSeo } from '@/composables/usePageSeo'

const { t, tm, rt } = useI18n()

usePageSeo({
  title: 'Kebijakan Privasi',
  description: "Kebijakan privasi Talita's Cake & Cupcakes.",
  path: '/privacy',
})
</script>

<template>
  <div class="tc-page max-w-[820px] mx-auto px-5 md:px-8 pt-14 pb-20">
    <!-- HEADER -->
    <div class="mb-10">
      <h1 class="font-display text-[clamp(32px,5vw,42px)] leading-[1.1] mb-3">
        {{ t('privacy.title') }}
      </h1>
      <p class="text-[13px] font-bold tracking-wide uppercase text-cocoa-400">
        {{ t('privacy.updated') }}
      </p>
    </div>

    <!-- INTRO -->
    <div class="bg-[#FBF3EA] border border-cream-300 rounded-[20px] p-6 md:p-7 mb-10">
      <p class="text-[15.5px] leading-[1.8] text-[#6E5A4D]">
        {{ t('privacy.intro') }}
      </p>
    </div>

    <!-- SECTIONS -->
    <div class="flex flex-col gap-8">
      <section
        v-for="(sec, i) in tm('privacy.sections')"
        :key="i"
        class="scroll-mt-24"
      >
        <h2 class="font-display text-xl text-cocoa-900 mb-3 flex items-baseline gap-2">
          <span class="text-brand-500 font-bold text-base tabular-nums">{{ i + 1 }}.</span>
          {{ rt(sec.title) }}
        </h2>
        <div class="flex flex-col gap-3 pl-0 sm:pl-6">
          <p
            v-for="(para, j) in sec.body"
            :key="j"
            class="text-[15px] leading-[1.8] text-[#6E5A4D]"
          >
            {{ rt(para) }}
          </p>
        </div>
      </section>
    </div>

    <!-- CONTACT NOTE -->
    <div class="mt-12 border-t border-cream-300 pt-6 text-[14px] leading-relaxed text-cocoa-400">
      {{ t('privacy.footerNote') }}
    </div>
  </div>
</template>
