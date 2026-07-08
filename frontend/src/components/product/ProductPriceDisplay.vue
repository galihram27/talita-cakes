<script setup>
import { formatRupiah } from '@/utils/formatCurrency'

defineProps({
  price: { type: Number, default: null },
  originalPrice: { type: Number, default: null },
  placeholder: { type: String, default: 'Select shape & size to see the price' },
})
</script>

<template>
  <div class="mb-7 flex items-baseline gap-2.5 flex-wrap">
    <p v-if="price !== null" class="text-[28px] font-bold tracking-tight text-brand-500">
      {{ formatRupiah(price) }}
    </p>
    <p v-else class="text-lg text-[#B7A18E]">{{ placeholder }}</p>

    <p
      v-if="price !== null && originalPrice !== null && originalPrice > price"
      class="text-[17px] text-[#B7A18E] line-through"
    >
      {{ formatRupiah(originalPrice) }}
    </p>
  </div>
</template>
