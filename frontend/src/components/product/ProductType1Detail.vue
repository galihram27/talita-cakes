<script setup>
import { ref, computed } from 'vue'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductFixedSpec from './ProductFixedSpec.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'

const props = defineProps({
  product: { type: Object, required: true },
})

const textOnCake = ref('')
const notes = ref('')
const quantity = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

// TYPE1 cuma punya 1 variant fixed
const variant = computed(() => props.product.variants?.[0] ?? null)

const finalPrice = computed(() => {
  if (!variant.value) return null
  const price = Number(variant.value.price)
  const discount = Number(props.product.discount ?? 0)
  return Math.round((price - (price * discount) / 100) * 100) / 100
})

const handleSubmit = async () => {
  submitError.value = ''
  submitSuccess.value = false

  if (quantity.value < 1) {
    submitError.value = 'Quantity minimal 1'
    return
  }

  isSubmitting.value = true
  try {
    await addItemToCart({
      productId: props.product.id,
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
        :original-price="Number(product.discount) > 0 ? Number(variant?.price) : null"
      />

      <ProductFixedSpec :shape="variant?.shape" :size="variant?.size" />

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