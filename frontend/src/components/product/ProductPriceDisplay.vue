<script setup>
import { formatRupiah } from '@/utils/formatCurrency'

defineProps({
  price: { type: Number, default: null },
  originalPrice: { type: Number, default: null },
  placeholder: { type: String, default: 'Pilih shape & size untuk melihat harga' },
})
</script>

<template>
  <div class="mb-8">
    <p v-if="price !== null" class="text-3xl font-extrabold">{{ formatRupiah(price) }}</p>
    <p v-else class="text-lg text-gray-400">{{ placeholder }}</p>

    <p
      v-if="price !== null && originalPrice !== null && originalPrice > price"
      class="text-sm text-gray-400 line-through mt-1"
    >
      {{ formatRupiah(originalPrice) }}
    </p>
  </div>
</template>