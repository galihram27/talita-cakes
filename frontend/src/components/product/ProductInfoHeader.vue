<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// label tipe memakai kamus yang sama dengan kartu tipe di HomeView
const typeLabel = (type) => {
  const num = { TYPE1: 1, TYPE2: 2, TYPE3: 3, TYPE4: 4 }[type]
  return num ? t(`home.types.t${num}.tag`) : type
}

const props = defineProps({
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  descriptionEn: { type: String, default: '' },
})

// deskripsi mengikuti bahasa aktif; fallback ke versi Indonesia
// untuk data lama yang versi Inggrisnya masih kosong
const shownDescription = computed(() =>
  locale.value === 'en' && props.descriptionEn ? props.descriptionEn : props.description
)
</script>

<template>
  <div>
    <span
      class="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-500 px-3 py-1.5 text-xs font-extrabold tracking-[0.1em] uppercase"
    >
      {{ typeLabel(type) }}
    </span>
    <h1 class="font-display text-[38px] leading-tight mt-3.5 mb-2.5">{{ name }}</h1>
    <p class="text-[15.5px] text-[#6E5A4D] leading-relaxed mb-7">{{ shownDescription }}</p>
  </div>
</template>
