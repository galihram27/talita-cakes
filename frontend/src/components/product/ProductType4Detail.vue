<script setup>
import { ref, computed } from 'vue'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductVariantPicker from './ProductVariantPicker.vue'
import DesignReferencePicker from './DesignReferencePicker.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'
import { CUSTOM_FLAVORS } from '@/config/constants'

const props = defineProps({
  product: { type: Object, required: true },
})

const selectedFlavor = ref('')
const selectedVariantId = ref(null)
const designImage = ref(null)
const textOnCake = ref('')
const notes = ref('')
const quantity = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const selectedVariant = computed(() =>
  props.product.variants?.find((v) => v.id === selectedVariantId.value) ?? null
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
    submitError.value = 'Pilih shape & size terlebih dahulu'
    return
  }
  if (!selectedFlavor.value) {
    submitError.value = 'Pilih flavor terlebih dahulu'
    return
  }
  if (quantity.value < 1) {
    submitError.value = 'Quantity minimal 1'
    return
  }

  isSubmitting.value = true
  try {
    await addItemToCart({
      productId: props.product.id,
      variantId: selectedVariantId.value,
      flavor: selectedFlavor.value,
      customImage: designImage.value?.url,
      quantity: quantity.value,
      textOnCake: textOnCake.value || undefined,
      notes: notes.value || undefined,
    })
    submitSuccess.value = true
  } catch (err) {
    submitError.value = err.response?.data?.message || 'Gagal menambahkan ke keranjang'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
    <ProductImage :image="product.image" :alt="product.name" />

    <div>
      <ProductInfoHeader :type="product.type" :name="product.name" :description="product.description" />

      <ProductPriceDisplay
        :price="finalPrice"
        :original-price="Number(product.discount) > 0 ? Number(selectedVariant?.price) : null"
      />

      <!-- Flavor: pilihan user, khusus TYPE4 -->
      <div class="mb-6">
        <label class="block text-sm font-semibold mb-2">Flavor</label>
        <select
          v-model="selectedFlavor"
          class="w-full rounded-xl border border-gray-300 px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        >
          <option value="" disabled>Choose Flavor</option>
          <option v-for="f in CUSTOM_FLAVORS" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>

      <ProductVariantPicker
        v-model:variant-id="selectedVariantId"
        :variants="product.variants"
        :discount="product.discount"
      />

      <DesignReferencePicker v-model="designImage" />

      <ProductOrderForm
        v-model:text-on-cake="textOnCake"
        v-model:notes="notes"
        v-model:quantity="quantity"
        use-stepper
        :is-submitting="isSubmitting"
        :submit-error="submitError"
        :submit-success="submitSuccess"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
