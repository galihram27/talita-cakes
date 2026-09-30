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
import { applyDiscount } from '@/utils/price'

/**
 * Detail cupcake. Cara memilihnya berbeda menurut kategori:
 * - Goodiebag : dijual per paket dengan pembelian minimal, tanpa pilihan isi
 *               box. Rasanya dipilih beberapa sekaligus (Original) atau
 *               tepat satu (Custom), tergantung sub-kategorinya.
 * - American Butter : rasa & dekorasi sudah ditetapkan admin.
 * - Kategori lain   : pembeli memilih isi box, rasa, dan acuan desain.
 */
const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

// Goodiebag dijual per paket: tidak ada pilihan isi box, dan ada jumlah
// pembelian minimal. Varian tunggalnya dipilih otomatis.
const isGoodiebag = computed(() => isGoodiebagCupcake(props.product.category))
const minQty = computed(() => goodiebagMinQty(props.product.category))

// Berapa rasa yang boleh dipilih, ditentukan sub-kategori goodiebag:
// Original boleh 1 sampai 4 rasa, Custom tepat satu rasa.
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

// American Butter sudah ditetapkan rasa & dekorasinya oleh admin, jadi
// pembeli tidak memilih apa pun. Kategori lain memilih sendiri.
const flavorIsFixed = computed(() => isFixedFlavorCupcake(props.product.category))
// Daftar rasa yang boleh dipilih, berbeda-beda per kategori
const flavorOptions = computed(() =>
  isGoodiebag.value
    ? goodiebagFlavorsForSubcategory(props.product.subcategory)
    : cupcakeFlavorsForCategory(props.product.category)
)

// Rasa goodiebag selalu disimpan sebagai daftar, walau hanya berisi satu —
// supaya sisa kode tidak perlu membedakan kedua cara pilih
const goodiebagSelectedFlavors = computed(() =>
  isSingleFlavor.value
    ? selectedFlavor.value
      ? [selectedFlavor.value]
      : []
    : selectedFlavors.value
)

// Tiap varian mewakili satu pilihan isi box; goodiebag hanya punya satu
const selectedVariant = computed(
  () => props.product.variants?.find((v) => v.id === selectedVariantId.value) ?? null
)

// Harga satu box setelah diskon
const unitPrice = computed(() => {
  if (!selectedVariant.value) return null
  return applyDiscount(selectedVariant.value.price, props.product.discount)
})

// Jumlah box yang dipesan. Goodiebag diketik sendiri oleh pembeli dan
// tidak boleh kurang dari pembelian minimal.
const boxCount = computed(() => {
  const q = Number(quantity.value)
  return Number.isInteger(q) && q > 0 ? q : minQty.value
})

// Yang ditampilkan berbeda: goodiebag menunjukkan total keseluruhan karena
// jumlahnya sudah diketik di halaman ini, sedangkan kategori lain menunjukkan
// harga per box — pengalian jumlahnya terjadi di keranjang.
const finalPrice = computed(() => {
  if (unitPrice.value === null) return null
  if (!isGoodiebag.value) return unitPrice.value
  return Math.round(unitPrice.value * boxCount.value * 100) / 100
})

// Harga coret sebelum diskon. Skalanya harus mengikuti finalPrice di atas,
// kalau tidak perbandingannya jadi menyesatkan.
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
    <!-- Memilih isi box menggeser galeri ke foto box itu, kalau admin
         memang menetapkan fotonya -->
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

      <!-- American Butter: rasa sudah ditetapkan, hanya ditampilkan -->
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

      <!-- Goodiebag: jumlah paket diketik di sini, bukan di bagian bawah -->
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

      <!-- Goodiebag Original: pilih 1 sampai 4 rasa -->
      <ProductFlavorPicker
        v-if="isMultiFlavor"
        v-model="selectedFlavors"
        :flavors="flavorOptions"
        :step-label="t('product.chooseFlavor')"
        multiple
        :max="flavorLimit.max"
        :hint="t('product.flavorRangeHint', { min: flavorLimit.min, max: flavorLimit.max })"
      />

      <!-- Goodiebag Custom: pilih tepat satu rasa -->
      <ProductFlavorPicker
        v-else-if="isSingleFlavor"
        v-model="selectedFlavor"
        :flavors="flavorOptions"
        :step-label="t('product.chooseFlavor')"
      />

      <!-- Kategori lain: pembeli memilih rasa sendiri dan boleh melampirkan
           acuan desain -->
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
