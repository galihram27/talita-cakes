<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductBoxPicker from './ProductBoxPicker.vue'
import ProductFlavorPicker from './ProductFlavorPicker.vue'
import DesignReferencePicker from './DesignReferencePicker.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'
import { formatRupiah } from '@/utils/formatCurrency'
import {
  cupcakeFlavorsForCategory,
  isFixedFlavorCupcake,
  isGoodiebagCupcake,
  goodiebagMinQty,
  goodiebagFlavorsForSubcategory,
  goodiebagFlavorLimit,
} from '@/config/productOptions'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

// Goodiebag: tidak ada pilihan isi box (harga tunggal per box) dan pembelian
// minimal sejumlah box. Varian tunggalnya dipilih otomatis.
const isGoodiebag = computed(() => isGoodiebagCupcake(props.product.category))
const minQty = computed(() => goodiebagMinQty(props.product.category))

// Goodiebag: batas jumlah rasa mengikuti sub-kategori produk.
// Original = pilih 1-4 rasa (jamak); Custom = pilih tepat 1 rasa (tunggal).
const flavorLimit = computed(() => goodiebagFlavorLimit(props.product.subcategory))
const isSingleFlavor = computed(() => isGoodiebag.value && flavorLimit.value.max === 1)
const isMultiFlavor = computed(() => isGoodiebag.value && flavorLimit.value.max > 1)

const selectedVariantId = ref(isGoodiebag.value ? props.product.variants?.[0]?.id ?? null : null)
const selectedFlavor = ref('')
const selectedFlavors = ref([]) // mode multiple (goodiebag)
const designImage = ref(null)
const textOnCake = ref('')
const notes = ref('')
const quantity = ref(isGoodiebag.value ? minQty.value : 1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

// American Butter: rasa & dekorasi sudah fix dari admin, user tidak memilih.
// Kategori lain: user pilih rasa (daftarnya beda per kategori) + unggah dekorasi.
const flavorIsFixed = computed(() => isFixedFlavorCupcake(props.product.category))
// Goodiebag: rasa mengikuti sub-kategori produk; kategori lain: rasa per kategori.
const flavorOptions = computed(() =>
  isGoodiebag.value
    ? goodiebagFlavorsForSubcategory(props.product.subcategory)
    : cupcakeFlavorsForCategory(props.product.category)
)

// Rasa goodiebag terpilih sebagai array (tunggal -> [rasa], jamak -> daftar).
const goodiebagSelectedFlavors = computed(() =>
  isSingleFlavor.value
    ? selectedFlavor.value
      ? [selectedFlavor.value]
      : []
    : selectedFlavors.value
)

// TYPE6: tiap variant = satu pilihan isi box (goodiebag = varian tunggal)
const selectedVariant = computed(
  () => props.product.variants?.find((v) => v.id === selectedVariantId.value) ?? null
)

// harga per box setelah diskon
const unitPrice = computed(() => {
  if (!selectedVariant.value) return null
  const price = Number(selectedVariant.value.price)
  const discount = Number(props.product.discount ?? 0)
  return Math.round((price - (price * discount) / 100) * 100) / 100
})

// jumlah box yang dipakai untuk perkalian; goodiebag diketik manual, minimal minQty
const boxCount = computed(() => {
  const q = Number(quantity.value)
  return Number.isInteger(q) && q > 0 ? q : minQty.value
})

// harga yang ditampilkan: goodiebag = total (harga per box x jumlah box),
// kategori lain = harga per box (quantity dikalikan nanti di keranjang)
const finalPrice = computed(() => {
  if (unitPrice.value === null) return null
  if (!isGoodiebag.value) return unitPrice.value
  return Math.round(unitPrice.value * boxCount.value * 100) / 100
})

// harga coret (sebelum diskon), skalanya disamakan dengan finalPrice
const originalPrice = computed(() => {
  if (!selectedVariant.value || Number(props.product.discount) <= 0) return null
  const base = Number(selectedVariant.value.price)
  return isGoodiebag.value ? Math.round(base * boxCount.value * 100) / 100 : base
})

const handleSubmit = async () => {
  submitError.value = ''
  submitSuccess.value = false

  if (!selectedVariantId.value) {
    submitError.value = t('product.chooseBoxFirst')
    return
  }
  if (isGoodiebag.value) {
    const n = goodiebagSelectedFlavors.value.length
    if (n < flavorLimit.value.min || n > flavorLimit.value.max) {
      submitError.value = isSingleFlavor.value
        ? t('product.chooseFlavorFirst')
        : t('product.chooseFlavorRange', {
            min: flavorLimit.value.min,
            max: flavorLimit.value.max,
          })
      return
    }
  } else if (!flavorIsFixed.value && !selectedFlavor.value) {
    submitError.value = t('product.chooseFlavorFirst')
    return
  }
  if (
    isGoodiebag.value &&
    (!Number.isInteger(quantity.value) || quantity.value < minQty.value)
  ) {
    submitError.value = t('product.goodiebagMin', { count: minQty.value })
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
      // goodiebag kirim `flavors` (bisa 1 atau beberapa); rasa-fix tidak kirim apa pun
      flavors: isGoodiebag.value ? goodiebagSelectedFlavors.value : undefined,
      flavor: isGoodiebag.value || flavorIsFixed.value ? undefined : selectedFlavor.value,
      customImage:
        isGoodiebag.value || flavorIsFixed.value ? undefined : designImage.value?.url,
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
    <!-- memilih isi box menggeser galeri ke foto box tsb (kalau ada fotonya) -->
    <ProductImage
      :image="product.image"
      :images="product.images"
      :alt="product.name"
      :active-url="selectedVariant?.image || ''"
    />

    <div>
      <ProductInfoHeader
        :type="product.type"
        :name="product.name"
        :description="product.description"
        :description-en="product.descriptionEn"
        :category="product.category"
        :subcategory="isGoodiebag ? product.subcategory : ''"
      />

      <ProductPriceDisplay
        :price="finalPrice"
        :original-price="originalPrice"
        :placeholder="t('product.chooseBoxFirst')"
      />

      <!-- Rasa fixed (American Butter), read-only -->
      <div
        v-if="flavorIsFixed && product.flavor"
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

      <!-- Goodiebag: harga tunggal per box; user mengetik jumlah box sendiri -->
      <div v-if="isGoodiebag" class="mb-6">
        <p class="text-[15px] font-extrabold mb-2.5">
          {{ t('product.boxAmount') }} <span class="text-brand-500">*</span>
        </p>
        <input
          v-model.number="quantity"
          type="number"
          inputmode="numeric"
          :min="minQty"
          :placeholder="String(minQty)"
          class="w-32 rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[15px] font-bold text-cocoa-900 placeholder-[#B7A18E] focus:outline-none focus:border-brand-500"
        />
        <p class="mt-2 text-[13px] font-semibold text-cocoa-400">
          {{ t('product.goodiebagMin', { count: minQty }) }}
        </p>
        <p v-if="unitPrice !== null" class="mt-1 text-[13px] font-semibold text-cocoa-400">
          {{ formatRupiah(unitPrice) }} {{ t('product.perBox') }} × {{ boxCount }} = {{ formatRupiah(finalPrice) }}
        </p>
      </div>

      <ProductBoxPicker
        v-else
        v-model:variant-id="selectedVariantId"
        :variants="product.variants"
        :discount="product.discount"
      />

      <!-- Goodiebag Original: pilih beberapa rasa (1-4), dekorasi dari admin -->
      <ProductFlavorPicker
        v-if="isMultiFlavor"
        v-model="selectedFlavors"
        :flavors="flavorOptions"
        :step-label="t('product.chooseFlavor')"
        multiple
        :max="flavorLimit.max"
        :hint="t('product.flavorRangeHint', { min: flavorLimit.min, max: flavorLimit.max })"
      />

      <!-- Goodiebag Custom: pilih tepat 1 rasa, dekorasi dari admin -->
      <ProductFlavorPicker
        v-else-if="isSingleFlavor"
        v-model="selectedFlavor"
        :flavors="flavorOptions"
        :step-label="t('product.chooseFlavor')"
      />

      <!-- Rasa & dekorasi pilihan user (Simple Decor / Custom 3D standalone) -->
      <template v-else-if="!flavorIsFixed">
        <ProductFlavorPicker
          v-model="selectedFlavor"
          :flavors="flavorOptions"
          :step-label="t('product.chooseFlavor')"
        />
        <DesignReferencePicker v-model="designImage" />
      </template>

      <ProductOrderForm
        :unit-price="finalPrice"
        v-model:text-on-cake="textOnCake"
        v-model:notes="notes"
        v-model:quantity="quantity"
        use-stepper
        :min-quantity="isGoodiebag ? minQty : 1"
        :quantity-suffix="isGoodiebag ? t('product.boxUnit') : ''"
        :hide-quantity="isGoodiebag"
        :is-submitting="isSubmitting"
        :submit-error="submitError"
        :submit-success="submitSuccess"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
