<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { X, Upload } from 'lucide-vue-next'
import {
  PRODUCT_TYPE_OPTIONS,
  PRODUCT_CATEGORIES,
  SHAPE_OPTIONS,
  ROUND_MIN_OPTIONS,
  SQUARE_MIN_OPTIONS,
  generateSizeRange,
  sizeLabel,
} from '@/config/productOptions'
import { createProduct, updateProduct } from '@/services/product.service'
import PriceInput from '@/components/admin/PriceInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // null = mode "Add", object produk = mode "Edit"
  product: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const isEdit = computed(() => !!props.product)

// ===== STATE FORM =====
const form = reactive({
  type: 'TYPE1',
  name: '',
  description: '',
  image: '',
  category: '',
  flavor: '',
  discount: 0,
})

// TYPE1 & TYPE2: satu variant manual fixed (size diisi manual oleh admin)
const type1 = reactive({ shape: 'ROUND', size: null, price: null })

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

// pilihan kategori mengikuti type yang sedang dipilih
const categoryOptions = computed(() => PRODUCT_CATEGORIES[form.type] ?? [])

// reset category kalau type diganti dan category lama tidak valid untuk type baru
watch(
  () => form.type,
  () => {
    if (form.category && !categoryOptions.value.includes(form.category)) {
      form.category = ''
    }
  }
)

// flavor fixed hanya untuk TYPE1 & TYPE3 (TYPE2 & TYPE4: user pilih sendiri saat order)
const showFlavor = computed(() => form.type === 'TYPE1' || form.type === 'TYPE3')
// TYPE1 & TYPE2: satu variant fixed; TYPE3 & TYPE4: grid variant per shape+size
const usesSingleVariant = computed(() => form.type === 'TYPE1' || form.type === 'TYPE2')
const usesVariantGrid = computed(() => form.type === 'TYPE3' || form.type === 'TYPE4')

const modalTitle = computed(() =>
  isEdit.value ? `Edit: ${props.product.name}` : 'Add Product'
)

// ===== RESET / PREFILL saat modal dibuka =====
const clearPriceMap = (map) => Object.keys(map).forEach((k) => delete map[k])

const resetForm = () => {
  errorMessage.value = ''
  isSubmitting.value = false
  clearPriceMap(roundPrices)
  clearPriceMap(squarePrices)
  roundMinSize.value = null
  squareMinSize.value = null

  if (!props.product) {
    Object.assign(form, {
      type: 'TYPE1',
      name: '',
      description: '',
      image: '',
      category: '',
      flavor: '',
      discount: 0,
    })
    Object.assign(type1, { shape: 'ROUND', size: null, price: null })
    return
  }

  const p = props.product
  Object.assign(form, {
    type: p.type,
    name: p.name ?? '',
    description: p.description ?? '',
    image: p.image ?? '',
    category: p.category ?? '',
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

// ===== IMAGE UPLOAD (base64 data URL, belum ada endpoint upload) =====
const openFilePicker = () => fileInputRef.value?.click()

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    form.image = reader.result // data URL
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const removeImage = () => {
  form.image = ''
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

const validate = () => {
  if (!form.name.trim()) return 'Nama produk wajib diisi'
  if (!form.description.trim()) return 'Deskripsi wajib diisi'
  if (!form.image) return 'Gambar produk wajib diunggah'
  if (!form.category) return 'Category wajib dipilih'
  if (showFlavor.value && !form.flavor.trim()) return 'Flavor wajib diisi'

  if (usesSingleVariant.value) {
    const size = Number(type1.size)
    if (!Number.isInteger(size) || size <= 0 || size > 100)
      return 'Size harus berupa angka bulat positif (maks 100)'
    if (!(Number(type1.price) > 0)) return 'Price harus lebih dari 0'
    return null
  }

  // TYPE3 / TYPE4
  if (!roundMinSize.value) return 'Pilih minimal size untuk Round'
  if (!squareMinSize.value) return 'Pilih minimal size untuk Square'

  const variants = buildVariantList()
  const incomplete = variants.some((v) => !(v.price > 0))
  if (incomplete) return 'Semua harga size wajib diisi dan lebih dari 0'

  return null
}

const buildPayload = () => {
  const base = {
    name: form.name.trim(),
    description: form.description.trim(),
    image: form.image,
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
      err.response?.data?.message || 'Gagal menyimpan produk. Coba lagi.'
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
    <div class="bg-white rounded-2xl w-full max-w-md shadow-xl">
      <!-- HEADER -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <h2 class="text-lg font-extrabold tracking-tight truncate">{{ modalTitle }}</h2>
        <button
          type="button"
          @click="close"
          class="p-1 text-gray-500 hover:text-gray-900 transition"
          aria-label="Tutup"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- BODY -->
      <form class="px-6 py-5 space-y-5" @submit.prevent="handleSubmit">
        <!-- PRODUCT TYPE (hanya saat Add) -->
        <div v-if="!isEdit">
          <label class="block text-sm font-medium mb-1.5">Product Type</label>
          <select
            v-model="form.type"
            class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none"
          >
            <option v-for="opt in PRODUCT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- CATEGORY (pilihan mengikuti type) -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Category</label>
          <select
            v-model="form.category"
            class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none"
          >
            <option value="" disabled>Pilih kategori...</option>
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <!-- NAME -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Product Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Product Name..."
            class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>

        <!-- DESCRIPTION -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none resize-none"
          ></textarea>
        </div>

        <!-- IMAGE -->
        <div>
          <label class="block text-sm font-medium mb-1.5">Image</label>
          <button
            type="button"
            @click="openFilePicker"
            class="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50 transition"
          >
            <Upload class="w-4 h-4" />
            Upload Image
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />

          <div v-if="form.image" class="flex items-center gap-3 mt-3">
            <div class="w-16 h-16 rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
              <img :src="form.image" alt="Preview" class="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              @click="removeImage"
              class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-500 transition"
              aria-label="Hapus gambar"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- FLAVOR fixed (TYPE1 & TYPE3) -->
        <div v-if="showFlavor">
          <label class="block text-sm font-medium mb-1.5">Flavor</label>
          <input
            v-model="form.flavor"
            type="text"
            placeholder="Flavor Name..."
            class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>

        <!-- ===== TYPE1 & TYPE2: shape + size + price + discount (1 variant fixed) ===== -->
        <template v-if="usesSingleVariant">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">Shape</label>
              <select
                v-model="type1.shape"
                class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none"
              >
                <option v-for="opt in SHAPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">Size (cm)</label>
              <input
                v-model.number="type1.size"
                type="number"
                min="1"
                placeholder="Size"
                class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">Price (Rp)</label>
              <PriceInput
                v-model="type1.price"
                class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">Discount (%)</label>
              <input
                v-model.number="form.discount"
                type="number"
                min="0"
                max="100"
                placeholder="Discount"
                class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
        </template>

        <!-- ===== TYPE3 / TYPE4: grid harga per shape + size ===== -->
        <template v-if="usesVariantGrid">
          <!-- ROUND -->
          <div>
            <label class="block text-sm font-semibold mb-1.5">Round</label>
            <select
              v-model.number="roundMinSize"
              class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none"
            >
              <option :value="null" disabled>(Min Size) - 30 cm</option>
              <option v-for="m in ROUND_MIN_OPTIONS" :key="m" :value="m">{{ m }} - 30 cm</option>
            </select>

            <div
              v-if="roundSizes.length"
              class="mt-3 rounded-2xl border border-gray-300 p-4 space-y-3"
            >
              <div v-for="s in roundSizes" :key="`r-${s}`">
                <p class="text-sm mb-1">{{ sizeLabel('ROUND', s) }}</p>
                <PriceInput
                  v-model="roundPrices[s]"
                  class="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- SQUARE -->
          <div>
            <label class="block text-sm font-semibold mb-1.5">Square</label>
            <select
              v-model.number="squareMinSize"
              class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none"
            >
              <option :value="null" disabled>(Min Size) - 30 cm</option>
              <option v-for="m in SQUARE_MIN_OPTIONS" :key="m" :value="m">
                {{ m }}×{{ m }} - 30×30 cm
              </option>
            </select>

            <div
              v-if="squareSizes.length"
              class="mt-3 rounded-2xl border border-gray-300 p-4 space-y-3"
            >
              <div v-for="s in squareSizes" :key="`s-${s}`">
                <p class="text-sm mb-1">{{ sizeLabel('SQUARE', s) }} - 30×30 cm</p>
                <PriceInput
                  v-model="squarePrices[s]"
                  class="w-full rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- DISCOUNT -->
          <div>
            <label class="block text-sm font-medium mb-1.5">Discount (%)</label>
            <input
              v-model.number="form.discount"
              type="number"
              min="0"
              max="100"
              placeholder="Discount"
              class="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
        </template>

        <!-- ERROR -->
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

        <!-- ACTIONS -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="close"
            :disabled="isSubmitting"
            class="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="rounded-full bg-brand-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50"
          >
            {{ isSubmitting ? 'Menyimpan...' : isEdit ? 'Save Changes' : 'Add Product' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
