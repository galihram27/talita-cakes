<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatRupiah } from '@/utils/formatCurrency'
import { applyDiscount } from '@/utils/price'
import { sizeLabel } from '@/config/productOptions'

/**
 * Pemilih bentuk & ukuran untuk kue yang punya banyak varian (TYPE3 & TYPE4).
 *
 * Pemilihannya bertingkat: pilih bentuk dulu, lalu ukuran yang tersedia untuk
 * bentuk itu. Ganti bentuk berarti pilihan ukuran sebelumnya batal.
 */

const { t } = useI18n()

const props = defineProps({
  variants: { type: Array, required: true },
  discount: { type: [Number, String], default: 0 },
  variantId: { type: String, default: null }, // dipakai lewat v-model
})

/**
 * `update:shape` dipakai komponen induk untuk menggeser galeri foto ke foto
 * bentuk yang dipilih.
 *
 * Bentuk dikabarkan terpisah dari `variantId` karena begitu bentuk diganti,
 * ukurannya ikut dibatalkan sehingga variantId sempat kosong — padahal galeri
 * tetap harus berpindah saat itu juga.
 */
const emit = defineEmits(['update:variantId', 'update:shape'])

const selectedShape = ref('ROUND')

// Bentuk yang benar-benar dijual untuk produk ini. Urutannya dipaksa
// bulat dulu baru kotak, biar konsisten di semua produk.
const availableShapes = computed(() => {
  const shapes = new Set(props.variants.map((v) => v.shape))
  return ['ROUND', 'SQUARE'].filter((s) => shapes.has(s))
})

// Ukuran untuk bentuk yang sedang dipilih, diurutkan dari yang terkecil
const sizesForSelectedShape = computed(() => {
  return props.variants
    .filter((v) => v.shape === selectedShape.value)
    .sort((a, b) => a.size - b.size)
})

const selectShape = (shape) => {
  selectedShape.value = shape
  emit('update:shape', shape)
  // Ukuran yang tadi dipilih belum tentu ada di bentuk baru, jadi dibatalkan
  emit('update:variantId', null)
}

const selectVariant = (id) => emit('update:variantId', id)

// Tentukan bentuk awal begitu data produk sampai. Bulat jadi pilihan utama;
// kalau produknya hanya kotak, ya kotak.
watch(
  () => props.variants,
  (variants) => {
    if (!variants || variants.length === 0) return
    const shapes = new Set(variants.map((v) => v.shape))
    selectedShape.value = shapes.has('ROUND') ? 'ROUND' : 'SQUARE'
    // Kabarkan juga bentuk awalnya, supaya galeri sudah selaras sejak halaman terbuka
    emit('update:shape', selectedShape.value)
  },
  { immediate: true }
)
</script>

<template>
  <div class="mb-6 max-w-md">
    <!-- Pilihan bentuk disembunyikan kalau cuma ada satu — tidak ada gunanya
         menyuruh memilih sesuatu yang tidak ada alternatifnya -->
    <template v-if="availableShapes.length > 1">
      <p class="text-[15px] font-extrabold mb-2.5">
        {{ t('product.chooseShape') }} <span class="text-brand-500">*</span>
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
            {{ shape === 'ROUND' ? t('product.round') : t('product.square') }}
          </span>
        </button>
      </div>
    </template>

    <!-- Pilihan ukuran, isinya berganti mengikuti bentuk yang dipilih -->
    <p class="text-[15px] font-extrabold mb-2.5" :class="availableShapes.length > 1 ? 'mt-5' : ''">
      {{ t('product.chooseSize') }} <span class="text-brand-500">*</span>
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
        <span class="font-extrabold text-sm text-cocoa-900">{{ sizeLabel(v.shape, v.size) }}</span>
        <span class="text-[11.5px] text-cocoa-400">
          {{ formatRupiah(applyDiscount(v.price, discount)) }}
        </span>
      </button>
    </div>
  </div>
</template>
