<script setup>
import { useI18n } from 'vue-i18n'
import { formatRupiah } from '@/utils/formatCurrency'

defineProps({
  price: { type: Number, default: null },
  originalPrice: { type: Number, default: null },
  placeholder: { type: String, default: '' },
  // teks kecil setelah harga, mis. "/ box" untuk goodiebag
  suffix: { type: String, default: '' },
})

const { t } = useI18n()
</script>

<template>
  <div class="mb-7 flex items-baseline gap-2.5 flex-wrap">
    <p v-if="price !== null" class="text-[28px] font-bold tracking-tight text-brand-500">
      {{ formatRupiah(price) }}<span v-if="suffix" class="text-base font-semibold text-[#B7A18E]"> {{ suffix }}</span>
    </p>
    <p v-else class="text-lg text-[#B7A18E]">{{ placeholder || t('product.pricePlaceholder') }}</p>

    <p
      v-if="price !== null && originalPrice !== null && originalPrice > price"
      class="text-[17px] text-[#B7A18E] line-through"
    >
      {{ formatRupiah(originalPrice) }}
    </p>
  </div>
</template>
