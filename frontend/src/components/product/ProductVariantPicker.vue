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
  <div>
    <div class="mb-6">
      <p class="text-sm font-semibold mb-2">Shape</p>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="shape in availableShapes"
          :key="shape"
          type="button"
          @click="selectShape(shape)"
          :class="[
            'rounded-xl border px-6 py-3.5 text-sm font-medium transition',
            selectedShape === shape
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-gray-300 hover:border-gray-500',
          ]"
        >
          {{ shape === 'ROUND' ? '● Round' : '■ Square' }}
        </button>
      </div>
    </div>

    <div class="mb-6">
      <p class="text-sm font-semibold mb-2">Size</p>
      <div class="space-y-3">
        <button
          v-for="v in sizesForSelectedShape"
          :key="v.id"
          type="button"
          @click="selectVariant(v.id)"
          :class="[
            'w-full flex items-center justify-between rounded-xl border px-5 py-3.5 text-sm font-medium transition',
            variantId === v.id
              ? 'border-brand-600 ring-2 ring-brand-500'
              : 'border-gray-300 hover:border-gray-500',
          ]"
        >
          <span>{{ v.size }} cm</span>
          <span>{{ formatRupiah(applyDiscount(v.price)) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>