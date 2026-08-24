<script setup>
import { useI18n } from 'vue-i18n'
import { formatRupiah } from '@/utils/formatCurrency'

/**
 * Pemilih isi box untuk cupcake (TYPE6).
 *
 * Dibuat terpisah dari ProductVariantPicker karena artinya berbeda: di sini
 * kolom `size` berarti JUMLAH CUPCAKE dalam satu box, bukan diameter kue,
 * dan tidak ada pilihan bentuk sama sekali.
 */
const props = defineProps({
  variants: { type: Array, required: true },
  discount: { type: [Number, String], default: 0 },
  variantId: { type: String, default: null }, // dipakai lewat v-model
})

defineEmits(['update:variantId'])
const { t } = useI18n()

// Diskon disimpan dalam persen. Angka ini hanya untuk ditampilkan —
// harga yang sesungguhnya tetap dihitung ulang oleh server saat memesan.
const applyDiscount = (price) => {
  const base = Number(price)
  const discount = Number(props.discount ?? 0)
  return Math.round((base - (base * discount) / 100) * 100) / 100
}

// Urutkan dari isi paling sedikit. Disalin dulu dengan [...] karena sort()
// mengubah array aslinya, dan itu milik komponen induk.
const sortedVariants = () => [...props.variants].sort((a, b) => a.size - b.size)
</script>

<template>
  <div class="mb-6 max-w-md">
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
