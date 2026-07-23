<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductVariantPicker from './ProductVariantPicker.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'
import { variantSizeLabel, isType5SizeSubcategory } from '@/config/productOptions'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

const notes = ref('')
const quantity = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

// Sub-kategori size-pilihan (mis. Basque): user memilih size (variant).
// Sub-kategori lain: 1 varian tetap dengan shape+size dari admin.
const isSizeSubcat = computed(() => isType5SizeSubcategory(props.product.subcategory))
const selectedVariantId = ref(null)

const activeVariant = computed(() =>
  isSizeSubcat.value
    ? props.product.variants?.find((v) => v.id === selectedVariantId.value) ?? null
    : props.product.variants?.[0] ?? null
)

const finalPrice = computed(() => {
  if (!activeVariant.value) return null
  const price = Number(activeVariant.value.price)
  const discount = Number(props.product.discount ?? 0)
  return Math.round((price - (price * discount) / 100) * 100) / 100
})

// label ukuran untuk sub-kategori 1-varian (read-only)
const sizeText = computed(() => {
  const v = props.product.variants?.[0]
  if (isSizeSubcat.value || !v || v.size == null) return ''
  const shapeWord = v.shape === 'ROUND' ? t('product.round') : t('product.square')
  return `${shapeWord} · ${variantSizeLabel(v.shape, v.size, v.sizeB)}`
})

const handleSubmit = async () => {
  submitError.value = ''
  submitSuccess.value = false

  if (isSizeSubcat.value && !selectedVariantId.value) {
    submitError.value = t('product.chooseSizeFirst')
    return
  }
  if (quantity.value < 1) {
    submitError.value = t('product.qtyMin')
    return
  }

  isSubmitting.value = true
  try {
    // TYPE5: user mengirim note & quantity (+ variantId untuk sub-kategori size-pilihan)
    await addItemToCart({
      productId: props.product.id,
      variantId: isSizeSubcat.value ? selectedVariantId.value : undefined,
      quantity: quantity.value,
      notes: notes.value || undefined,
    })
    submitSuccess.value = true
  } catch (err) {
    submitError.value = err.response?.data?.message || t('product.addToCartFailed')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid md:grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-6 md:gap-8 lg:gap-10 items-start">
    <ProductImage :image="product.image" :images="product.images" :alt="product.name" />

    <div>
      <ProductInfoHeader
        :type="product.type"
        :name="product.name"
        :description="product.description"
        :description-en="product.descriptionEn"
        :category="product.category"
        :subcategory="product.subcategory"
      />

      <ProductPriceDisplay
        :price="finalPrice"
        :original-price="Number(product.discount) > 0 ? Number(activeVariant?.price) : null"
        :placeholder="isSizeSubcat ? t('product.chooseSizeFirst') : ''"
      />

      <!-- Flavor fixed untuk TYPE5, read-only -->
      <div
        v-if="product.flavor"
        class="mb-6 flex items-center gap-3.5 rounded-2xl border border-cream-300 bg-gradient-to-br from-white to-[#FDF7F1] px-4 py-3.5 max-w-md"
      >
        <span class="flex flex-col gap-0.5 min-w-0">
          <span class="text-[11px] font-extrabold uppercase tracking-widest text-cocoa-400">
            {{ t('product.flavor') }}
          </span>
          <span class="font-display text-[16.5px] text-cocoa-900 leading-tight">
            {{ product.flavor }}
          </span>
        </span>
      </div>

      <!-- Size-pilihan (Basque): user memilih ukuran -->
      <ProductVariantPicker
        v-if="isSizeSubcat"
        v-model:variant-id="selectedVariantId"
        :variants="product.variants"
        :discount="product.discount"
      />

      <!-- Size tetap (sub-kategori lain): read-only -->
      <div
        v-else-if="sizeText"
        class="mb-6 flex items-center gap-3.5 rounded-2xl border border-cream-300 bg-gradient-to-br from-white to-[#FDF7F1] px-4 py-3.5 max-w-md"
      >
        <span class="flex flex-col gap-0.5 min-w-0">
          <span class="text-[11px] font-extrabold uppercase tracking-widest text-cocoa-400">
            {{ t('product.size') }}
          </span>
          <span class="font-display text-[16.5px] text-cocoa-900 leading-tight">
            {{ sizeText }}
          </span>
        </span>
      </div>

      <!-- TYPE5: user hanya isi note & jumlah item -->
      <ProductOrderForm
        v-model:notes="notes"
        v-model:quantity="quantity"
        :show-text-on-cake="false"
        :is-submitting="isSubmitting"
        :submit-error="submitError"
        :submit-success="submitSuccess"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
