<script setup>
const TYPE_LABELS = {
  TYPE1: 'Signature Collection',
  TYPE2: 'Flavor & Design Choice',
  TYPE3: 'Choose Your Size',
  TYPE4: 'Fully Custom Cake',
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
      {{ TYPE_LABELS[type] || type }}
    </span>
    <h1 class="font-display text-[38px] leading-tight mt-3.5 mb-2.5">{{ name }}</h1>
    <p class="text-[15.5px] text-[#6E5A4D] leading-relaxed mb-7">{{ description }}</p>
  </div>
</template>
