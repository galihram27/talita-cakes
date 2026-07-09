<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// label tipe memakai kamus yang sama dengan kartu tipe di HomeView
const typeLabel = (type) => {
  const num = { TYPE1: 1, TYPE2: 2, TYPE3: 3, TYPE4: 4 }[type]
  return num ? t(`home.types.t${num}.tag`) : type
}

defineProps({
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div>
    <span
      class="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-500 px-3 py-1.5 text-xs font-extrabold tracking-[0.1em] uppercase"
    >
      {{ typeLabel(type) }}
    </span>
    <h1 class="font-display text-[38px] leading-tight mt-3.5 mb-2.5">{{ name }}</h1>
    <p class="text-[15.5px] text-[#6E5A4D] leading-relaxed mb-7">{{ description }}</p>
  </div>
</template>
