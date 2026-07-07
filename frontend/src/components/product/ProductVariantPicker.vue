<script setup>
import { ref, computed, watch } from 'vue'
import { formatRupiah } from '@/utils/formatCurrency'

const props = defineProps({
  variants: { type: Array, required: true },
  discount: { type: [Number, String], default: 0 },
  variantId: { type: String, default: null }, // v-model
})

const emit = defineEmits(['update:variantId'])

const selectedShape = ref('ROUND')

const availableShapes = computed(() => {
  const shapes = new Set(props.variants.map((v) => v.shape))
  return ['ROUND', 'SQUARE'].filter((s) => shapes.has(s))
})

const sizesForSelectedShape = computed(() => {
  return props.variants
    .filter((v) => v.shape === selectedShape.value)
    .sort((a, b) => a.size - b.size)
})

const applyDiscount = (price) => {
  const base = Number(price)
  const discount = Number(props.discount ?? 0)
  return Math.round((base - (base * discount) / 100) * 100) / 100
}

const selectShape = (shape) => {
  selectedShape.value = shape
  emit('update:variantId', null) // reset pilihan size setiap ganti shape
}

const selectVariant = (id) => emit('update:variantId', id)

// set default shape begitu variants tersedia (mis. setelah fetch produk selesai)
watch(
  () => props.variants,
  (variants) => {
    if (!variants || variants.length === 0) return
    const shapes = new Set(variants.map((v) => v.shape))
    selectedShape.value = shapes.has('ROUND') ? 'ROUND' : 'SQUARE'
  },
  { immediate: true }
)
</script>

<template>
  <div class="mb-6">
    <p class="text-[15px] font-extrabold mb-2.5">
      1 · Choose shape <span class="text-brand-500">*</span>
    </p>
    <div class="flex gap-2.5">
      <button
        v-for="shape in availableShapes"
        :key="shape"
        type="button"
        @click="selectShape(shape)"
        class="flex-1 rounded-xl border-2 p-3.5 flex flex-col items-center gap-1.5 transition-colors"
        :class="selectedShape === shape
          ? 'border-brand-500 bg-[#F4D6D1]'
          : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
      >
        <span
          class="w-[22px] h-[22px] border-2 border-cocoa-900"
          :class="shape === 'ROUND' ? 'rounded-full' : 'rounded-[4px]'"
        />
        <span class="font-extrabold text-[14.5px] text-cocoa-900">
          {{ shape === 'ROUND' ? 'Round' : 'Square' }}
        </span>
      </button>
    </div>

    <p class="text-[15px] font-extrabold mt-5 mb-2.5">
      2 · Choose size <span class="text-brand-500">*</span>
    </p>
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        v-for="v in sizesForSelectedShape"
        :key="v.id"
        type="button"
        @click="selectVariant(v.id)"
        class="rounded-[10px] border-2 px-1.5 py-2.5 flex flex-col items-center gap-0.5 transition-colors"
        :class="variantId === v.id
          ? 'border-brand-500 bg-[#F4D6D1]'
          : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
      >
        <span class="font-extrabold text-sm text-cocoa-900">{{ v.size }} cm</span>
        <span class="text-[11.5px] text-cocoa-400">
          {{ formatRupiah(applyDiscount(v.price)) }}
        </span>
      </button>
    </div>
  </div>
</template>
