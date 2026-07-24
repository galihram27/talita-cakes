<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductFixedSpec from './ProductFixedSpec.vue'
import ProductFlavorPicker from './ProductFlavorPicker.vue'
import DesignReferencePicker from './DesignReferencePicker.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'
import { TYPE2_FLAVORS } from '@/config/constants'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

const selectedFlavor = ref('')
const designImage = ref(null)
const textOnCake = ref('')
const notes = ref('')
const quantity = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

// TYPE2 cuma punya 1 variant fixed (shape & size tidak bisa dipilih)
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

  if (!selectedFlavor.value) {
    submitError.value = t('product.chooseFlavorFirst')
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
      flavor: selectedFlavor.value,
      customImage: designImage.value?.url,
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
  <div class="grid md:grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-6 md:gap-8 lg:gap-10 items-start">
    <ProductImage :image="product.image" :images="product.images" :alt="product.name" />

    <div>
      <ProductInfoHeader :type="product.type" :name="product.name" :description="product.description" :description-en="product.descriptionEn" :category="product.category" />

      <ProductPriceDisplay
        :price="finalPrice"
        :original-price="Number(product.discount) > 0 ? Number(variant?.price) : null"
      />

      <ProductFixedSpec :shape="variant?.shape" :size="variant?.size" />

      <!-- Flavor: pilihan user, khusus TYPE2 -->
      <ProductFlavorPicker
        v-model="selectedFlavor"
        :flavors="TYPE2_FLAVORS"
        :step-label="t('product.chooseFlavorStep1')"
      />

      <DesignReferencePicker v-model="designImage" />

      <ProductOrderForm
        :unit-price="finalPrice"
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
