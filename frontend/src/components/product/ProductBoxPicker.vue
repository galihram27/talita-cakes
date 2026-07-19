<script setup>
import { useI18n } from 'vue-i18n'
import { formatRupiah } from '@/utils/formatCurrency'

// Pemilih isi box untuk TYPE6 (cupcakes).
// Varian cupcake memakai ProductVariant.size sebagai JUMLAH PCS dalam box,
// bukan diameter cake — karena itu tidak memakai ProductVariantPicker
// yang berbasis shape (Round/Square).
const props = defineProps({
  variants: { type: Array, required: true },
  discount: { type: [Number, String], default: 0 },
  variantId: { type: String, default: null }, // v-model
})

defineEmits(['update:variantId'])
const { t } = useI18n()

const applyDiscount = (price) => {
  const base = Number(price)
  const discount = Number(props.discount ?? 0)
  return Math.round((base - (base * discount) / 100) * 100) / 100
}

// urut dari isi paling sedikit supaya pilihan terbaca menaik
const sortedVariants = () => [...props.variants].sort((a, b) => a.size - b.size)
</script>

<template>
  <div class="mb-6">
    <p class="text-[15px] font-extrabold mb-2.5">
      {{ t('product.chooseBox') }} <span class="text-brand-500">*</span>
    </p>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <button
        v-for="v in sortedVariants()"
        :key="v.id"
        type="button"
        @click="$emit('update:variantId', v.id)"
        class="rounded-[10px] border-2 px-1.5 py-2.5 flex flex-col items-center gap-0.5 transition-colors"
        :class="variantId === v.id
          ? 'border-brand-500 bg-[#F4D6D1]'
          : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
      >
        <span class="font-extrabold text-sm text-cocoa-900">
          {{ t('product.boxOf', { count: v.size }) }}
        </span>
        <span class="text-[11.5px] text-cocoa-400">
          {{ formatRupiah(applyDiscount(v.price)) }}
        </span>
      </button>
    </div>
  </div>
</template>
