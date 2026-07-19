<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, Upload, ChevronDown } from 'lucide-vue-next'
import {
  PRODUCT_CATEGORIES,
  TYPE5_SUBCATEGORIES,
  cupcakeBoxesForCategory,
  isFixedFlavorCupcake,
  ROUND_MIN_OPTIONS,
  SQUARE_MIN_OPTIONS,
  generateSizeRange,
  sizeLabel,
} from '@/config/productOptions'
import { createProduct, updateProduct } from '@/services/product.service'
import { uploadImage } from '@/services/upload.service'
import { useProductStore } from '@/stores/product.store'
import PriceInput from '@/components/admin/PriceInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // null = mode "Add", object produk = mode "Edit"
  product: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const productStore = useProductStore()

const isEdit = computed(() => !!props.product)

// label tipe & bentuk mengikuti bahasa aktif (nilai tetap sinkron dengan backend)
const PRODUCT_TYPE_OPTIONS = computed(() =>
  [1, 2, 3, 4, 5, 6].map((num) => ({
    value: `TYPE${num}`,
    label: `${t('admin.products.type', { num })} (${t(`home.types.t${num}.tag`)})`,
  }))
)
const SHAPE_OPTIONS = computed(() => [
  { value: 'ROUND', label: t('admin.productForm.round') },
  { value: 'SQUARE', label: t('admin.productForm.square') },
])

// ===== STATE FORM =====
const form = reactive({
  type: 'TYPE1',
  name: '',
  description: '',
  descriptionEn: '',
  images: [], // banyak foto per produk; foto pertama = cover
  category: '',
  subcategory: '', // hanya TYPE5 (non-cake)
  flavor: '',
  discount: 0,
})

// TYPE1 & TYPE2: satu variant manual fixed (size diisi manual oleh admin)
const type1 = reactive({ shape: 'ROUND', size: null, price: null })

// TYPE5 (non-cake): harga tunggal, tanpa shape/size
const nonCakePrice = ref(null)

// TYPE6 (cupcakes): harga per isi box -> { [isiBox]: price }
const boxPrices = reactive({})

// TYPE3 / TYPE4: min size per shape + harga per size
const roundMinSize = ref(null)
const squareMinSize = ref(null)
const roundPrices = reactive({}) // { [size]: price }
const squarePrices = reactive({})

const fileInputRef = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')

// daftar size aktif berdasarkan min size yang dipilih
const roundSizes = computed(() =>
  roundMinSize.value ? generateSizeRange(roundMinSize.value) : []
)
const squareSizes = computed(() =>
  squareMinSize.value ? generateSizeRange(squareMinSize.value) : []
)

// ===== COPY HARGA DARI PRODUK LAIN (TYPE3/TYPE4) =====
// Copy per bentuk: satu dropdown untuk Round, satu untuk Square. Sumber: produk
// bervariasi (punya variant bentuk terkait) dari TYPE3/TYPE4 — lintas tipe
// diizinkan — selain produk yang sedang diedit. Copy hanya mengisi HARGA untuk
// ukuran yang sedang aktif; ukuran min & diskon tidak ikut diubah.
const copySource = reactive({ ROUND: '', SQUARE: '' })
const copyNotice = reactive({ ROUND: '', SQUARE: '' })
const shapePrices = { ROUND: roundPrices, SQUARE: squarePrices }
const shapeSizes = { ROUND: roundSizes, SQUARE: squareSizes }

// produk yang punya minimal satu variant dengan bentuk tsb (kandidat sumber)
const copyableProductsByShape = (shape) =>
  productStore.products.filter(
    (p) =>
      (p.type === 'TYPE3' || p.type === 'TYPE4') &&
      p.id !== props.product?.id &&
      Array.isArray(p.variants) &&
      p.variants.some((v) => v.shape === shape)
  )
const roundSourceOptions = computed(() => copyableProductsByShape('ROUND'))
const squareSourceOptions = computed(() => copyableProductsByShape('SQUARE'))

// baru boleh copy kalau grid ukuran bentuk tsb sudah muncul (ukuran min dipilih)
const canCopyPrice = (shape) => shapeSizes[shape].value.length > 0

const applyCopiedPrices = (shape) => {
  copyNotice[shape] = ''
  const source = copyableProductsByShape(shape).find((p) => p.id === copySource[shape])
  // reset pilihan supaya memilih produk yang sama lagi tetap memicu copy ulang
  copySource[shape] = ''
  if (!source) return

  const variants = source.variants ?? []
  const prices = shapePrices[shape]
  let matched = 0
  for (const s of shapeSizes[shape].value) {
    const v = variants.find((x) => x.shape === shape && Number(x.size) === Number(s))
    if (v) {
      prices[s] = Number(v.price)
      matched++
    }
  }

  copyNotice[shape] = matched
    ? t('admin.productForm.copyPriceDone', { name: source.name })
    : t('admin.productForm.copyPriceNoMatch', { name: source.name })
}

// pilihan kategori mengikuti type yang sedang dipilih
const categoryOptions = computed(() => PRODUCT_CATEGORIES[form.type] ?? [])

// TYPE5: pilihan sub-kategori mengikuti kategori (level-1) yang dipilih
const subcategoryOptions = computed(() =>
  form.type === 'TYPE5' ? TYPE5_SUBCATEGORIES[form.category] ?? [] : []
)

// reset category kalau type diganti dan category lama tidak valid untuk type baru
watch(
  () => form.type,
  () => {
    if (form.category && !categoryOptions.value.includes(form.category)) {
      form.category = ''
    }
  }
)

// reset subcategory kalau kategori diganti dan subcategory lama tidak lagi valid
watch(
  () => form.category,
  () => {
    if (form.subcategory && !subcategoryOptions.value.includes(form.subcategory)) {
      form.subcategory = ''
    }

    // TYPE6: tiap kategori punya pilihan isi box berbeda (mis. Paper Topper
    // tidak punya box 4). Buang harga box yang tidak lagi tersedia supaya
    // tidak ikut terkirim sebagai varian yang ditolak server.
    if (usesCupcake.value) {
      const allowed = cupcakeBoxes.value
      Object.keys(boxPrices).forEach((size) => {
        if (!allowed.includes(Number(size))) delete boxPrices[size]
      })
    }
  }
)

// TYPE6 (cupcakes): pilihan isi box tergantung kategori yang dipilih
const usesCupcake = computed(() => form.type === 'TYPE6')
const cupcakeBoxes = computed(() =>
  usesCupcake.value ? cupcakeBoxesForCategory(form.category) : []
)
// American Butter rasanya ditentukan admin; kategori cupcake lain user yang pilih
const cupcakeFlavorIsFixed = computed(
  () => usesCupcake.value && isFixedFlavorCupcake(form.category)
)

// flavor fixed untuk TYPE1, TYPE3, TYPE5, dan kategori cupcake ber-rasa-fix
// (TYPE2 & TYPE4: user pilih sendiri saat order)
const showFlavor = computed(
  () =>
    form.type === 'TYPE1' ||
    form.type === 'TYPE3' ||
    form.type === 'TYPE5' ||
    cupcakeFlavorIsFixed.value
)
// TYPE1 & TYPE2: satu variant fixed; TYPE3 & TYPE4: grid variant per shape+size
const usesSingleVariant = computed(() => form.type === 'TYPE1' || form.type === 'TYPE2')
const usesVariantGrid = computed(() => form.type === 'TYPE3' || form.type === 'TYPE4')
// TYPE5 (non-cake): harga tunggal tanpa shape/size
const usesNonCake = computed(() => form.type === 'TYPE5')

const modalTitle = computed(() =>
  isEdit.value
    ? t('admin.productForm.editTitle', { name: props.product.name })
    : t('admin.productForm.addTitle')
)

// ===== RESET / PREFILL saat modal dibuka =====
const clearPriceMap = (map) => Object.keys(map).forEach((k) => delete map[k])

const resetForm = () => {
  errorMessage.value = ''
  isSubmitting.value = false
  copySource.ROUND = ''
  copySource.SQUARE = ''
  copyNotice.ROUND = ''
  copyNotice.SQUARE = ''
  clearPriceMap(roundPrices)
  clearPriceMap(squarePrices)
  clearPriceMap(boxPrices)
  roundMinSize.value = null
  squareMinSize.value = null
  nonCakePrice.value = null

  if (!props.product) {
    Object.assign(form, {
      type: 'TYPE1',
      name: '',
      description: '',
      descriptionEn: '',
      images: [],
      category: '',
      subcategory: '',
      flavor: '',
      discount: 0,
    })
    Object.assign(type1, { shape: 'ROUND', size: null, price: null })
    return
  }

  const p = props.product
  // produk lama mungkin cuma punya `image`; jadikan foto pertama galeri
  const prefillImages =
    Array.isArray(p.images) && p.images.length ? [...p.images] : p.image ? [p.image] : []
  Object.assign(form, {
    type: p.type,
    name: p.name ?? '',
    description: p.description ?? '',
    descriptionEn: p.descriptionEn ?? '',
    images: prefillImages,
    category: p.category ?? '',
    subcategory: p.subcategory ?? '',
    flavor: p.flavor ?? '',
    discount: Number(p.discount ?? 0),
  })

  const variants = p.variants ?? []

  if (p.type === 'TYPE1' || p.type === 'TYPE2') {
    const v = variants[0]
    Object.assign(type1, {
      shape: v?.shape ?? 'ROUND',
      size: v?.size ?? null,
      price: v ? Number(v.price) : null,
    })
    return
  }

  if (p.type === 'TYPE5') {
    // TYPE5 punya 1 variant harga tunggal (tanpa shape/size)
    nonCakePrice.value = variants[0] ? Number(variants[0].price) : null
    return
  }

  if (p.type === 'TYPE6') {
    // TYPE6: tiap variant = satu isi box; `size` menyimpan jumlah pcs
    variants.forEach((v) => {
      boxPrices[v.size] = Number(v.price)
    })
    return
  }

  // TYPE3 / TYPE4: turunkan min size + isi harga dari variant yang ada
  const round = variants.filter((v) => v.shape === 'ROUND')
  const square = variants.filter((v) => v.shape === 'SQUARE')

  if (round.length) {
    roundMinSize.value = Math.min(...round.map((v) => v.size))
    round.forEach((v) => (roundPrices[v.size] = Number(v.price)))
  }
  if (square.length) {
    squareMinSize.value = Math.min(...square.map((v) => v.size))
    square.forEach((v) => (squarePrices[v.size] = Number(v.price)))
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true }
)

// ===== IMAGE UPLOAD (ke Cloudinary via /uploads/images) =====
// Simpan URL Cloudinary, BUKAN base64 — base64 membengkakkan DB & bikin
// fetch products lambat. Mendukung banyak foto: setiap file yang dipilih
// di-upload lalu URL-nya ditambahkan ke form.images.
const isUploading = ref(false)

const openFilePicker = () => fileInputRef.value?.click()

const handleFileChange = async (e) => {
  const files = Array.from(e.target.files ?? [])
  e.target.value = ''
  if (!files.length) return

  isUploading.value = true
  errorMessage.value = ''
  try {
    const results = await Promise.all(files.map((file) => uploadImage(file)))
    form.images.push(...results.map((r) => r.url))
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || t('admin.productForm.uploadFailed')
  } finally {
    isUploading.value = false
  }
}

const removeImage = (index) => {
  form.images.splice(index, 1)
}

// jadikan foto tertentu sebagai cover (pindahkan ke posisi pertama)
const makeCover = (index) => {
  if (index <= 0) return
  const [img] = form.images.splice(index, 1)
  form.images.unshift(img)
}

// ===== SUBMIT =====
const buildVariantList = () => {
  const variants = []
  for (const size of roundSizes.value) {
    variants.push({ shape: 'ROUND', size, price: Number(roundPrices[size]) })
  }
  for (const size of squareSizes.value) {
    variants.push({ shape: 'SQUARE', size, price: Number(squarePrices[size]) })
  }
  return variants
}

// TYPE6: hanya isi box yang diberi harga > 0 yang dijadikan varian.
// Box yang dikosongkan admin dianggap tidak dijual untuk produk tsb.
const buildBoxVariants = () =>
  cupcakeBoxes.value
    .filter((size) => Number(boxPrices[size]) > 0)
    .map((size) => ({ size, price: Number(boxPrices[size]) }))

const validate = () => {
  if (!form.name.trim()) return t('admin.productForm.nameRequired')
  if (!form.description.trim()) return t('admin.productForm.descriptionRequired')
  if (!form.descriptionEn.trim()) return t('admin.productForm.descriptionEnRequired')
  if (!form.images.length) return t('admin.productForm.imageRequired')
  if (!form.category) return t('admin.productForm.categoryRequired')
  if (usesNonCake.value && !form.subcategory) return t('admin.productForm.subcategoryRequired')
  if (showFlavor.value && !form.flavor.trim()) return t('admin.productForm.flavorRequired')

  if (usesSingleVariant.value) {
    const size = Number(type1.size)
    if (!Number.isInteger(size) || size <= 0 || size > 100)
      return t('admin.productForm.sizeInvalid')
    if (!(Number(type1.price) > 0)) return t('admin.productForm.priceInvalid')
    return null
  }

  if (usesNonCake.value) {
    if (!(Number(nonCakePrice.value) > 0)) return t('admin.productForm.priceInvalid')
    return null
  }

  if (usesCupcake.value) {
    // minimal satu isi box diberi harga; box yang dikosongkan berarti tidak dijual
    if (buildBoxVariants().length === 0) return t('admin.productForm.boxPriceRequired')
    return null
  }

  // TYPE3 / TYPE4
  if (!roundMinSize.value) return t('admin.productForm.roundMinRequired')
  if (!squareMinSize.value) return t('admin.productForm.squareMinRequired')

  const variants = buildVariantList()
  const incomplete = variants.some((v) => !(v.price > 0))
  if (incomplete) return t('admin.productForm.pricesIncomplete')

  return null
}

const buildPayload = () => {
  const base = {
    name: form.name.trim(),
    description: form.description.trim(),
    descriptionEn: form.descriptionEn.trim(),
    images: [...form.images],
    category: form.category,
    discount: Number(form.discount) || 0,
  }

  if (usesSingleVariant.value) {
    const payload = {
      ...base,
      type: form.type,
      shape: type1.shape,
      size: Number(type1.size),
      price: Number(type1.price),
    }
    // hanya TYPE1 yang punya flavor fixed (TYPE2: user pilih saat order)
    if (form.type === 'TYPE1') payload.flavor = form.flavor.trim()
    return payload
  }

  if (usesNonCake.value) {
    return {
      ...base,
      type: 'TYPE5',
      subcategory: form.subcategory,
      flavor: form.flavor.trim(),
      price: Number(nonCakePrice.value),
    }
  }

  if (usesCupcake.value) {
    const payload = { ...base, type: 'TYPE6', variants: buildBoxVariants() }
    // rasa fixed hanya untuk American Butter; kategori lain user pilih saat order
    if (cupcakeFlavorIsFixed.value) payload.flavor = form.flavor.trim()
    return payload
  }

  const variants = buildVariantList()

  if (form.type === 'TYPE3') {
    return { ...base, type: 'TYPE3', flavor: form.flavor.trim(), variants }
  }
  return { ...base, type: 'TYPE4', variants }
}

// untuk edit TYPE2/3: cari variant lama yang tidak ada lagi -> minta hapus
const buildRemoveVariants = () => {
  const kept = new Set(buildVariantList().map((v) => `${v.shape}-${v.size}`))
  return (props.product.variants ?? [])
    .filter((v) => !kept.has(`${v.shape}-${v.size}`))
    .map((v) => ({ shape: v.shape, size: v.size }))
}

const handleSubmit = async () => {
  errorMessage.value = ''
  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isSubmitting.value = true
  try {
    if (!isEdit.value) {
      await createProduct(buildPayload())
    } else {
      // saat edit, type tidak boleh berubah -> pakai type produk asli
      const payload = buildPayload()
      delete payload.type
      if (usesVariantGrid.value) {
        payload.removeVariants = buildRemoveVariants()
      }
      await updateProduct(props.product.id, payload)
    }
    emit('saved')
    emit('close')
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || t('admin.productForm.saveFailed')
  } finally {
    isSubmitting.value = false
  }
}

const close = () => {
  if (isSubmitting.value) return
  emit('close')
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto"
  >
    <div class="bg-white rounded-2xl w-full max-w-md shadow-[0_10px_40px_-12px_rgba(51,38,31,0.35)]">
      <!-- HEADER -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-cream-200">
        <h2 class="text-xl text-cocoa-900 truncate">{{ modalTitle }}</h2>
        <button
          type="button"
          @click="close"
          class="p-1 text-cocoa-400 hover:text-cocoa-900 transition"
          :aria-label="t('common.close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- BODY -->
      <form class="px-6 py-5 space-y-5" @submit.prevent="handleSubmit">
        <!-- PRODUCT TYPE (hanya saat Add) -->
        <div v-if="!isEdit">
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.productType') }}</label>
          <div class="relative">
            <select
              v-model="form.type"
              class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2.5 text-sm bg-white focus:outline-none cursor-pointer"
            >
              <option v-for="opt in PRODUCT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <ChevronDown
              class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        <!-- CATEGORY (pilihan mengikuti type) -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.category') }}</label>
          <div class="relative">
            <select
              v-model="form.category"
              class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2.5 text-sm bg-white focus:outline-none cursor-pointer"
            >
              <option value="" disabled>{{ t('admin.productForm.selectCategory') }}</option>
              <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
            </select>
            <ChevronDown
              class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        <!-- SUBCATEGORY (TYPE5 non-cake; pilihan mengikuti category) -->
        <div v-if="usesNonCake">
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.subcategory') }}</label>
          <div class="relative">
            <select
              v-model="form.subcategory"
              :disabled="!form.category"
              class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2.5 text-sm bg-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>{{ t('admin.productForm.selectSubcategory') }}</option>
              <option v-for="s in subcategoryOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <ChevronDown
              class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        <!-- NAME -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.name') }}</label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('admin.productForm.namePlaceholder')"
            class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>

        <!-- DESCRIPTION (ID) -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.descriptionId') }}</label>
          <textarea
            v-model="form.description"
            rows="4"
            :placeholder="t('admin.productForm.descriptionHint')"
            class="w-full rounded-2xl border border-cream-300 px-4 py-3 text-sm focus:outline-none resize-y whitespace-pre-line"
          ></textarea>
        </div>

        <!-- DESCRIPTION (EN) -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.descriptionEn') }}</label>
          <textarea
            v-model="form.descriptionEn"
            rows="4"
            :placeholder="t('admin.productForm.descriptionHint')"
            class="w-full rounded-2xl border border-cream-300 px-4 py-3 text-sm focus:outline-none resize-y whitespace-pre-line"
          ></textarea>
        </div>

        <!-- IMAGE (banyak foto; foto pertama = cover) -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.images') }}</label>
          <button
            type="button"
            @click="openFilePicker"
            :disabled="isUploading"
            class="inline-flex items-center gap-2 rounded-full border border-cream-300 px-5 py-2 text-sm font-semibold text-cocoa-500 hover:bg-cream-50 hover:border-brand-400 transition disabled:opacity-50"
          >
            <Upload class="w-4 h-4" />
            {{ isUploading ? t('admin.productForm.uploading') : t('admin.productForm.upload') }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="handleFileChange"
          />

          <p v-if="form.images.length" class="text-xs text-cocoa-400 mt-2">
            {{ t('admin.productForm.coverHint') }}
          </p>

          <div v-if="form.images.length" class="grid grid-cols-4 gap-3 mt-3">
            <div
              v-for="(img, index) in form.images"
              :key="index"
              class="relative aspect-square rounded-lg border overflow-hidden bg-cream-100 group"
              :class="index === 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-cream-300'"
            >
              <button type="button" @click="makeCover(index)" class="w-full h-full" :title="t('admin.productForm.setAsCover')">
                <img :src="img" alt="Preview" class="w-full h-full object-cover" />
              </button>

              <span
                v-if="index === 0"
                class="absolute bottom-0 inset-x-0 bg-brand-500 text-white text-[10px] font-semibold text-center py-0.5"
              >
                {{ t('admin.productForm.cover') }}
              </span>

              <button
                type="button"
                @click.stop="removeImage(index)"
                class="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 border border-cream-300 text-cocoa-500 flex items-center justify-center hover:border-brand-400 hover:text-brand-600 transition"
                :aria-label="t('admin.productForm.removeImage')"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- FLAVOR fixed (TYPE1 & TYPE3) -->
        <div v-if="showFlavor">
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.flavor') }}</label>
          <input
            v-model="form.flavor"
            type="text"
            :placeholder="t('admin.productForm.flavorPlaceholder')"
            class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>

        <!-- ===== TYPE1 & TYPE2: shape + size + price + discount (1 variant fixed) ===== -->
        <template v-if="usesSingleVariant">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.shape') }}</label>
              <div class="relative">
                <select
                  v-model="type1.shape"
                  class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2.5 text-sm bg-white focus:outline-none cursor-pointer"
                >
                  <option v-for="opt in SHAPE_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <ChevronDown
                  class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.size') }}</label>
              <input
                v-model.number="type1.size"
                type="number"
                min="1"
                :placeholder="t('admin.productForm.sizePlaceholder')"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.price') }}</label>
              <PriceInput
                v-model="type1.price"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.discount') }}</label>
              <input
                v-model.number="form.discount"
                type="number"
                min="0"
                max="100"
                :placeholder="t('admin.productForm.discountPlaceholder')"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
        </template>

        <!-- ===== TYPE5 (non-cake): harga tunggal + discount (tanpa shape/size) ===== -->
        <template v-if="usesNonCake">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.price') }}</label>
              <PriceInput
                v-model="nonCakePrice"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.discount') }}</label>
              <input
                v-model.number="form.discount"
                type="number"
                min="0"
                max="100"
                :placeholder="t('admin.productForm.discountPlaceholder')"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
        </template>

        <!-- ===== TYPE6 (cupcakes): harga per isi box + discount ===== -->
        <template v-if="usesCupcake">
          <div>
            <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
              {{ t('admin.productForm.boxPrices') }}
            </label>

            <p v-if="!form.category" class="text-xs text-cocoa-400">
              {{ t('admin.productForm.selectCategoryFirst') }}
            </p>

            <template v-else>
              <p class="text-xs text-cocoa-400 mb-2">
                {{ t('admin.productForm.boxPriceHint') }}
              </p>
              <div class="rounded-2xl border border-cream-300 p-4 space-y-3">
                <div v-for="b in cupcakeBoxes" :key="`box-${b}`">
                  <p class="text-sm mb-1">{{ t('product.boxOf', { count: b }) }}</p>
                  <PriceInput
                    v-model="boxPrices[b]"
                    class="w-full rounded-full border border-cream-300 px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </template>
          </div>

          <div>
            <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.discount') }}</label>
            <input
              v-model.number="form.discount"
              type="number"
              min="0"
              max="100"
              :placeholder="t('admin.productForm.discountPlaceholder')"
              class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
        </template>

        <!-- ===== TYPE3 / TYPE4: grid harga per shape + size ===== -->
        <template v-if="usesVariantGrid">
          <!-- ROUND -->
          <div>
            <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.round') }}</label>
            <div class="relative">
              <select
                v-model.number="roundMinSize"
                class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2.5 text-sm bg-white focus:outline-none cursor-pointer"
              >
                <option :value="null" disabled>{{ t('admin.productForm.minSizePlaceholder') }}</option>
                <option v-for="m in ROUND_MIN_OPTIONS" :key="m" :value="m">{{ m }} cm</option>
              </select>
              <ChevronDown
                class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>

            <!-- COPY HARGA ROUND DARI PRODUK LAIN -->
            <div v-if="roundSizes.length" class="mt-3">
              <label class="block text-xs font-semibold text-cocoa-500 mb-1.5">{{ t('admin.productForm.copyPrice') }}</label>
              <div class="relative">
                <select
                  v-model="copySource.ROUND"
                  :disabled="!canCopyPrice('ROUND')"
                  @change="applyCopiedPrices('ROUND')"
                  class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2 text-sm bg-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>{{ t('admin.productForm.copyPriceSelect') }}</option>
                  <option v-for="p in roundSourceOptions" :key="p.id" :value="p.id">
                    {{ p.name }}
                  </option>
                </select>
                <ChevronDown
                  class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
              <p v-if="copyNotice.ROUND" class="text-xs text-brand-600 mt-1.5">
                {{ copyNotice.ROUND }}
              </p>
            </div>

            <div
              v-if="roundSizes.length"
              class="mt-3 rounded-2xl border border-cream-300 p-4 space-y-3"
            >
              <div v-for="s in roundSizes" :key="`r-${s}`">
                <p class="text-sm mb-1">{{ sizeLabel('ROUND', s) }}</p>
                <PriceInput
                  v-model="roundPrices[s]"
                  class="w-full rounded-full border border-cream-300 px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- SQUARE -->
          <div>
            <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.square') }}</label>
            <div class="relative">
              <select
                v-model.number="squareMinSize"
                class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2.5 text-sm bg-white focus:outline-none cursor-pointer"
              >
                <option :value="null" disabled>{{ t('admin.productForm.minSizePlaceholder') }}</option>
                <option v-for="m in SQUARE_MIN_OPTIONS" :key="m" :value="m">
                  {{ m }}×{{ m }} cm
                </option>
              </select>
              <ChevronDown
                class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>

            <!-- COPY HARGA SQUARE DARI PRODUK LAIN -->
            <div v-if="squareSizes.length" class="mt-3">
              <label class="block text-xs font-semibold text-cocoa-500 mb-1.5">{{ t('admin.productForm.copyPrice') }}</label>
              <div class="relative">
                <select
                  v-model="copySource.SQUARE"
                  :disabled="!canCopyPrice('SQUARE')"
                  @change="applyCopiedPrices('SQUARE')"
                  class="appearance-none w-full rounded-full border border-cream-300 pl-4 pr-10 py-2 text-sm bg-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" disabled>{{ t('admin.productForm.copyPriceSelect') }}</option>
                  <option v-for="p in squareSourceOptions" :key="p.id" :value="p.id">
                    {{ p.name }}
                  </option>
                </select>
                <ChevronDown
                  class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
              <p v-if="copyNotice.SQUARE" class="text-xs text-brand-600 mt-1.5">
                {{ copyNotice.SQUARE }}
              </p>
            </div>

            <div
              v-if="squareSizes.length"
              class="mt-3 rounded-2xl border border-cream-300 p-4 space-y-3"
            >
              <div v-for="s in squareSizes" :key="`s-${s}`">
                <p class="text-sm mb-1">{{ sizeLabel('SQUARE', s) }}</p>
                <PriceInput
                  v-model="squarePrices[s]"
                  class="w-full rounded-full border border-cream-300 px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- DISCOUNT -->
          <div>
            <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.discount') }}</label>
            <input
              v-model.number="form.discount"
              type="number"
              min="0"
              max="100"
              :placeholder="t('admin.productForm.discountPlaceholder')"
              class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
        </template>

        <!-- ERROR -->
        <p v-if="errorMessage" class="text-sm text-brand-600">{{ errorMessage }}</p>

        <!-- ACTIONS -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="close"
            :disabled="isSubmitting"
            class="rounded-full border border-cream-300 px-5 py-2.5 text-sm font-semibold text-cocoa-500 hover:bg-cream-50 transition disabled:opacity-50"
          >
            {{ t('admin.productForm.cancel') }}
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || isUploading"
            class="rounded-full bg-brand-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-brand-600 transition disabled:opacity-50"
          >
            {{ isSubmitting ? t('admin.productForm.saving') : isEdit ? t('admin.productForm.saveChanges') : t('admin.productForm.addProduct') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
