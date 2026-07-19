<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductVariantPicker from './ProductVariantPicker.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

const selectedVariantId = ref(null)
const selectedShape = ref('')
const textOnCake = ref('')
const notes = ref('')
const quantity = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const selectedVariant = computed(() =>
  props.product.variants?.find((v) => v.id === selectedVariantId.value) ?? null
)

// Foto yang mewakili bentuk terpilih. Admin menetapkan satu foto per bentuk,
// dilekatkan ke semua ukuran bentuk tsb — jadi cukup ambil yang pertama ada.
const shapeImage = computed(
  () =>
    props.product.variants?.find((v) => v.shape === selectedShape.value && v.image)
      ?.image ?? ''
)

const finalPrice = computed(() => {
  if (!selectedVariant.value) return null
  const price = Number(selectedVariant.value.price)
  const discount = Number(props.product.discount ?? 0)
  return Math.round((price - (price * discount) / 100) * 100) / 100
})

const handleSubmit = async () => {
  submitError.value = ''
  submitSuccess.value = false

  if (!selectedVariantId.value) {
    submitError.value = t('product.chooseVariantFirst')
    return
  }
  if (quantity.value < 1) {
    submitError.value = t('product.qtyMin')
    return
  }

  isSubmitting.value = true
  try {
    await addItemToCart({
      productId: props.product.id,
      variantId: selectedVariantId.value,
      quantity: quantity.value,
      textOnCake: textOnCake.value || undefined,
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
  <div class="grid md:grid-cols-[minmax(0,384px)_minmax(0,448px)] justify-center gap-6 md:gap-8 items-start">
    <!-- memilih bentuk menggeser galeri ke foto bentuk tsb (kalau ada fotonya) -->
    <ProductImage
      :image="product.image"
      :images="product.images"
      :alt="product.name"
      :active-url="shapeImage"
    />

    <div>
      <ProductInfoHeader :type="product.type" :name="product.name" :description="product.description" :description-en="product.descriptionEn" :category="product.category" />

      <ProductPriceDisplay
        :price="finalPrice"
        :original-price="Number(product.discount) > 0 ? Number(selectedVariant?.price) : null"
      />

      <!-- Flavor fixed untuk TYPE3, read-only (gaya kartu spec desain) -->
      <div
        class="mb-6 flex items-center gap-3.5 rounded-2xl border border-cream-300 bg-gradient-to-br from-white to-[#FDF7F1] px-4 py-3.5"
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

      <ProductVariantPicker
        v-model:variant-id="selectedVariantId"
        @update:shape="selectedShape = $event"
        :variants="product.variants"
        :discount="product.discount"
      />

      <ProductOrderForm
        v-model:text-on-cake="textOnCake"
        v-model:notes="notes"
        v-model:quantity="quantity"
        :is-submitting="isSubmitting"
        :submit-error="submitError"
        :submit-success="submitSuccess"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
