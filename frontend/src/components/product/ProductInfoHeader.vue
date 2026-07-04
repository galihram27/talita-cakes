<script setup>
const TYPE_LABELS = {
  TYPE1: 'Fixed',
  TYPE2: 'Custom Flavor',
  TYPE3: 'Semi-Custom',
  TYPE4: 'Fully Custom',
}

defineProps({
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div>
    <span class="inline-block rounded-full border border-brand-600 text-brand-600 px-4 py-1.5 text-xs font-semibold mb-4">
      {{ TYPE_LABELS[type] || type }}
    </span>
    <h1 class="text-4xl font-extrabold mb-4 leading-tight">{{ name }}</h1>
    <p class="text-sm text-gray-600 leading-relaxed mb-8">{{ description }}</p>
  </div>
</template>