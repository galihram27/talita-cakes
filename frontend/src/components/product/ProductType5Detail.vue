<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import ProductImage from './ProductImage.vue'
import ProductInfoHeader from './ProductInfoHeader.vue'
import ProductPriceDisplay from './ProductPriceDisplay.vue'
import ProductVariantPicker from './ProductVariantPicker.vue'
import ProductOrderForm from './ProductOrderForm.vue'
import { addItemToCart } from '@/services/cart.service'
import {
  variantSizeLabel,
  isType5SizeSubcategory,
  usesFilling,
  usesTopping,
  MAX_TOPPING_SELECT,
  isBreadCategory,
  breadSizeForVariant,
} from '@/config/productOptions'
import { formatRupiah } from '@/utils/formatCurrency'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

const notes = ref('')
const quantity = ref(1)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

// Sub-kategori size-pilihan (mis. Basque) & semua produk Bread: user memilih
// ukuran (variant). Sub-kategori lain: 1 varian tetap dengan shape+size dari admin.
const isSizeSubcat = computed(() => isType5SizeSubcategory(props.product.subcategory))
const isBread = computed(() => isBreadCategory(props.product.category))
const usesSizePicker = computed(() => isSizeSubcat.value || isBread.value)
const selectedVariantId = ref(null)

const activeVariant = computed(() =>
  usesSizePicker.value
    ? props.product.variants?.find((v) => v.id === selectedVariantId.value) ?? null
    : props.product.variants?.[0] ?? null
)

// Ukuran Bread untuk picker: petakan variant produk ke label + dimensi tetap.
const breadSizeDesc = (s) => {
  if (s.shape === null) return t('product.boxOf', { count: s.size })
  if (s.shape === 'SQUARE') return `${s.size}×${s.sizeB ?? s.size} cm`
  return `${s.size} cm`
}
const breadSizeOptions = computed(() => {
  if (!isBread.value) return []
  return (props.product.variants ?? [])
    .map((v) => {
      const s = breadSizeForVariant(v)
      return s
        ? { id: v.id, label: s.label, desc: breadSizeDesc(s), price: Number(v.price) }
        : null
    })
    .filter(Boolean)
})

const baseFinalPrice = computed(() => {
  if (!activeVariant.value) return null
  const price = Number(activeVariant.value.price)
  const discount = Number(props.product.discount ?? 0)
  return Math.round((price - (price * discount) / 100) * 100) / 100
})

// ===== FILLING (CINROLLS VAN DEPOK) — pilih SATU, pakai harga =====
const fillingConfig = computed(() =>
  usesFilling(props.product.subcategory) ? props.product.filling : null
)
const hasFilling = computed(() => (fillingConfig.value?.options?.length ?? 0) > 0)

// nama filling yang sedang dipilih (tunggal)
const selectedFilling = ref('')

// Awali dengan opsi default (mis. "Tanpa Filling") supaya tidak pernah kosong.
watch(
  fillingConfig,
  (cfg) => {
    if (!cfg?.options?.length) {
      selectedFilling.value = ''
      return
    }
    const di =
      Number.isInteger(cfg.defaultIndex) &&
      cfg.defaultIndex >= 0 &&
      cfg.defaultIndex < cfg.options.length
        ? cfg.defaultIndex
        : 0
    selectedFilling.value = cfg.options[di].name
  },
  { immediate: true }
)

const selectFilling = (name) => {
  selectedFilling.value = name
}

// ===== HARGA KOMBINASI (filling + topping) =====
const comboPrices = computed(() =>
  Array.isArray(props.product.comboPrices) ? props.product.comboPrices : []
)
// harga tambahan untuk pasangan (filling terpilih, satu topping); 0 kalau tak ada
const comboPriceOf = (toppingName) => {
  const row = comboPrices.value.find(
    (c) => c.filling === selectedFilling.value && c.topping === toppingName
  )
  return row ? Number(row.price) || 0 : 0
}

// ===== TOPPING (CINROLLS VAN DEPOK) — wajib pilih min 1, tanpa harga =====
const toppingConfig = computed(() =>
  usesTopping(props.product.subcategory) ? props.product.topping : null
)
const hasTopping = computed(() => (toppingConfig.value?.options?.length ?? 0) > 0)
const toppingMax = computed(() =>
  Math.min(toppingConfig.value?.maxSelect ?? 1, MAX_TOPPING_SELECT)
)

// nama-nama topping yang dipilih user (bisa beberapa)
const selectedToppings = ref([])
watch(toppingConfig, () => {
  selectedToppings.value = []
})

const isToppingSelected = (name) => selectedToppings.value.includes(name)

const toggleTopping = (name) => {
  const i = selectedToppings.value.indexOf(name)
  if (i >= 0) {
    selectedToppings.value.splice(i, 1)
  } else {
    // abaikan klik kalau sudah mencapai batas maksimal pilihan
    if (selectedToppings.value.length >= toppingMax.value) return
    selectedToppings.value.push(name)
  }
}

// total tambahan dari kombinasi: Σ harga (filling terpilih × tiap topping terpilih)
const comboPriceAdd = computed(() =>
  selectedToppings.value.reduce((sum, t) => sum + comboPriceOf(t), 0)
)

// harga tampil = harga dasar + tambahan kombinasi
const finalPrice = computed(() =>
  baseFinalPrice.value == null ? null : baseFinalPrice.value + comboPriceAdd.value
)

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

  if (usesSizePicker.value && !selectedVariantId.value) {
    submitError.value = t('product.chooseSizeFirst')
    return
  }
  // topping wajib dipilih minimal satu
  if (hasTopping.value && selectedToppings.value.length === 0) {
    submitError.value = t('product.topping.required')
    return
  }
  if (quantity.value < 1) {
    submitError.value = t('product.qtyMin')
    return
  }

  isSubmitting.value = true
  try {
    // TYPE5: note & quantity (+ variantId untuk sub-kategori size-pilihan,
    // + filling/toppings untuk CINROLLS VAN DEPOK)
    await addItemToCart({
      productId: props.product.id,
      variantId: usesSizePicker.value ? selectedVariantId.value : undefined,
      filling: hasFilling.value ? selectedFilling.value : undefined,
      toppings: hasTopping.value ? selectedToppings.value : undefined,
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
        :placeholder="usesSizePicker ? t('product.chooseSizeFirst') : ''"
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

      <!-- Ukuran Bread: user memilih Personal / Family / Sharing -->
      <div v-if="isBread" class="mb-6 max-w-md">
        <p class="text-[15px] font-extrabold mb-2.5">
          {{ t('product.chooseSize') }} <span class="text-brand-500">*</span>
        </p>
        <div class="flex flex-col gap-2">
          <button
            v-for="opt in breadSizeOptions"
            :key="opt.id"
            type="button"
            @click="selectedVariantId = opt.id"
            class="flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors"
            :class="selectedVariantId === opt.id
              ? 'border-brand-500 bg-[#F4D6D1]'
              : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
          >
            <span
              class="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
              :class="selectedVariantId === opt.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-[#C9B6A6]'"
            >
              <Check v-if="selectedVariantId === opt.id" class="w-3.5 h-3.5" stroke-width="3" />
            </span>
            <span class="flex-1 min-w-0">
              <span class="block font-bold text-[14.5px] text-cocoa-900 leading-tight">{{ opt.label }}</span>
              <span class="block text-[12.5px] text-cocoa-400">{{ opt.desc }}</span>
            </span>
            <span class="shrink-0 text-[13.5px] font-extrabold text-brand-500">
              {{ formatRupiah(opt.price) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Size-pilihan (Basque): user memilih ukuran -->
      <ProductVariantPicker
        v-else-if="isSizeSubcat"
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

      <!-- FILLING (CINROLLS VAN DEPOK): pilih satu, pakai harga -->
      <div v-if="hasFilling" class="mb-6 max-w-md">
        <p class="text-[15px] font-extrabold mb-1">
          {{ t('product.filling.title') }}
          <span class="text-cocoa-400 font-semibold text-[13px]">
            {{ t('product.filling.pickOne') }}
          </span>
        </p>
        <div class="flex flex-col gap-2 mt-2.5">
          <button
            v-for="opt in fillingConfig.options"
            :key="opt.name"
            type="button"
            @click="selectFilling(opt.name)"
            class="flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors"
            :class="selectedFilling === opt.name
              ? 'border-brand-500 bg-[#F4D6D1]'
              : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
          >
            <span
              class="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
              :class="selectedFilling === opt.name ? 'border-brand-500 bg-brand-500 text-white' : 'border-[#C9B6A6]'"
            >
              <Check v-if="selectedFilling === opt.name" class="w-3.5 h-3.5" stroke-width="3" />
            </span>
            <span class="flex-1 font-bold text-[14.5px] text-cocoa-900">{{ opt.name }}</span>
          </button>
        </div>
      </div>

      <!-- TOPPING (CINROLLS VAN DEPOK): wajib pilih min 1; harga per kombinasi -->
      <div v-if="hasTopping" class="mb-6 max-w-md">
        <p class="text-[15px] font-extrabold mb-1">
          {{ t('product.topping.title') }} <span class="text-brand-500">*</span>
          <span class="text-cocoa-400 font-semibold text-[13px]">
            {{
              toppingMax > 1
                ? t('product.topping.pickUpTo', { max: toppingMax })
                : t('product.topping.pickOne')
            }}
          </span>
        </p>
        <div class="flex flex-col gap-2 mt-2.5">
          <button
            v-for="opt in toppingConfig.options"
            :key="opt.name"
            type="button"
            @click="toggleTopping(opt.name)"
            class="flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors disabled:opacity-45"
            :disabled="!isToppingSelected(opt.name) && selectedToppings.length >= toppingMax"
            :class="isToppingSelected(opt.name)
              ? 'border-brand-500 bg-[#F4D6D1]'
              : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
          >
            <span
              class="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
              :class="isToppingSelected(opt.name) ? 'border-brand-500 bg-brand-500 text-white' : 'border-[#C9B6A6]'"
            >
              <Check v-if="isToppingSelected(opt.name)" class="w-3.5 h-3.5" stroke-width="3" />
            </span>
            <span class="flex-1 font-bold text-[14.5px] text-cocoa-900">{{ opt.name }}</span>
            <span
              v-if="comboPriceOf(opt.name) > 0"
              class="shrink-0 text-[13px] font-extrabold text-brand-500"
            >
              +{{ formatRupiah(comboPriceOf(opt.name)) }}
            </span>
          </button>
        </div>
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
