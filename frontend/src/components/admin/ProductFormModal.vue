<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, Upload, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-vue-next'
import {
  PRODUCT_CATEGORIES,
  TYPE5_SUBCATEGORIES,
  cupcakeBoxesForCategory,
  isFixedFlavorCupcake,
  isGoodiebagCupcake,
  goodiebagMinQty,
  goodiebagSubcategories,
  type5SizeConfig,
  ROUND_MIN_OPTIONS,
  SQUARE_MIN_OPTIONS,
  generateSizeRange,
  sizeLabel,
  usesFilling,
  usesTopping,
  MAX_FILLING_OPTIONS,
  MAX_TOPPING_OPTIONS,
  MAX_TOPPING_SELECT,
  isBreadCategory,
  BREAD_SIZES,
  breadSizeForVariant,
} from '@/config/productOptions'
import { createProduct, updateProduct } from '@/services/product.service'
import { uploadImage } from '@/services/upload.service'
import { useProductStore } from '@/stores/product.store'
import PriceInput from '@/components/admin/PriceInput.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // null = mode "Add", object produk = mode "Edit"
  product: { type: Object, default: null },
  // true = mode "Copy": form di-prefill dari `product` tapi tetap MEMBUAT produk baru
  copy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const productStore = useProductStore()

// Copy memakai data produk untuk prefill tapi bukan mode edit (membuat produk baru)
const isEdit = computed(() => !!props.product && !props.copy)

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

// TYPE5 (non-cake): harga tunggal + shape & size (admin input).
// ROUND -> pakai size; SQUARE -> pakai size (dimensi 1) & sizeB (dimensi 2).
const nonCakePrice = ref(null)
const nonCake = reactive({ shape: 'ROUND', size: null, sizeB: null })
// TYPE5 sub-kategori size-pilihan (Basque): harga per size -> { [size]: price }
const nonCakeSizePrices = reactive({})

// TYPE5 Bread: harga per ukuran bernama -> { PERSONAL, FAMILY, SHARING }
const breadSizePrices = reactive({})

// TYPE5 CINROLLS VAN DEPOK: konfigurasi pilihan FILLING (pilih satu, tanpa harga).
// Harga ada di comboRows (per kombinasi filling + topping).
// enabled: apakah produk memakai filling. options: [{ name }].
// defaultIndex: opsi yang dipakai otomatis kalau user tidak memilih.
const filling = reactive({
  enabled: false,
  defaultIndex: 0,
  options: [],
})

// Konfigurasi TOPPING (wajib pilih min 1, boleh beberapa, tanpa harga).
// enabled: apakah produk memakai topping. options: [{ name }].
// maxSelect: batas jumlah topping yang boleh dipilih user.
const topping = reactive({
  enabled: false,
  maxSelect: 1,
  options: [],
})

// Harga TAMBAHAN per kombinasi (filling + topping) — daftar manual.
// Tiap baris: { filling, topping, price }.
const comboRows = reactive({ list: [] })

// TYPE6 (cupcakes): harga per isi box -> { [isiBox]: price }
const boxPrices = reactive({})
// TYPE6 goodiebag: harga tunggal per box (tanpa pilihan isi box)
const goodiebagPrice = ref(null)
// TYPE6: foto yang mewakili tiap isi box -> { [isiBox]: url }.
// Diambil dari foto yang sudah diunggah (form.images), bukan unggahan terpisah.
const boxImages = reactive({})

// TYPE3 / TYPE4: min size per shape + harga per size
const roundMinSize = ref(null)
const squareMinSize = ref(null)
const roundPrices = reactive({}) // { [size]: price }
const squarePrices = reactive({})
// TYPE3 / TYPE4: satu foto per BENTUK -> { ROUND: url, SQUARE: url }.
// Foto ini nanti dilekatkan ke semua ukuran milik bentuk tsb.
const shapeImages = reactive({ ROUND: '', SQUARE: '' })

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

// Pilihan sub-kategori: TYPE5 (non-cake) per kategori, atau Goodiebag (TYPE6).
const subcategoryOptions = computed(() => {
  if (form.type === 'TYPE5') return TYPE5_SUBCATEGORIES[form.category] ?? []
  if (form.type === 'TYPE6' && isGoodiebagCupcake(form.category)) return goodiebagSubcategories()
  return []
})

// Apakah kategori terpilih memakai sub-kategori? (TYPE5 tertentu / Goodiebag)
const hasSubcategory = computed(() => subcategoryOptions.value.length > 0)

// TYPE5 sub-kategori dengan pilihan size (Basque): admin isi harga per size,
// bukan shape+size tunggal.
const nonCakeSizeConfig = computed(() =>
  form.type === 'TYPE5' ? type5SizeConfig(form.subcategory) : null
)
const usesNonCakeSize = computed(() => usesNonCake.value && !!nonCakeSizeConfig.value)
const nonCakeSizes = computed(() => nonCakeSizeConfig.value?.sizes ?? [])

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
      Object.keys(boxImages).forEach((size) => {
        if (!allowed.includes(Number(size))) delete boxImages[size]
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
// Goodiebag: harga tunggal per box, tanpa grid isi box
const usesGoodiebag = computed(
  () => usesCupcake.value && isGoodiebagCupcake(form.category)
)
const goodiebagMin = computed(() => goodiebagMinQty(form.category))

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
// TYPE5 Bread: user memilih ukuran bernama (harga per ukuran diisi admin)
const usesBread = computed(() => form.type === 'TYPE5' && isBreadCategory(form.category))

// daftar ukuran Bread + deskripsi dimensi tetap (untuk label di form)
const breadSizeList = computed(() =>
  BREAD_SIZES.map((s) => ({
    ...s,
    desc:
      s.shape === null
        ? t('product.boxOf', { count: s.size })
        : s.shape === 'SQUARE'
          ? `${s.size}×${s.sizeB ?? s.size} cm`
          : `${s.size} cm`,
  }))
)

// ukuran Bread yang diberi harga > 0 -> jadi varian { key, price }
const buildBreadSizeVariants = () =>
  BREAD_SIZES.filter((s) => Number(breadSizePrices[s.key]) > 0).map((s) => ({
    key: s.key,
    price: Number(breadSizePrices[s.key]),
  }))

// ===== FILLING & TOPPING (CINROLLS VAN DEPOK) =====
// Sub-kategori yang memakai pilihan filling/topping (admin bisa mengaktifkannya).
const usesFillingSubcat = computed(
  () => form.type === 'TYPE5' && usesFilling(form.subcategory)
)
const usesToppingSubcat = computed(
  () => form.type === 'TYPE5' && usesTopping(form.subcategory)
)

const canAddFillingOption = computed(
  () => filling.options.length < MAX_FILLING_OPTIONS
)
const addFillingOption = () => {
  if (!canAddFillingOption.value) return
  filling.options.push({ name: '' })
}
const removeFillingOption = (index) => {
  filling.options.splice(index, 1)
  // jaga defaultIndex tetap valid setelah penghapusan
  if (filling.defaultIndex >= filling.options.length) {
    filling.defaultIndex = Math.max(0, filling.options.length - 1)
  }
}

const canAddToppingOption = computed(
  () => topping.options.length < MAX_TOPPING_OPTIONS
)
// batas jumlah pilihan user tidak boleh melebihi jumlah opsi maupun MAX_TOPPING_SELECT
const toppingMaxSelectCeiling = computed(() =>
  Math.min(topping.options.length || 1, MAX_TOPPING_SELECT)
)
const addToppingOption = () => {
  if (!canAddToppingOption.value) return
  topping.options.push({ name: '' })
}
const removeToppingOption = (index) => {
  topping.options.splice(index, 1)
  if (topping.maxSelect > toppingMaxSelectCeiling.value) {
    topping.maxSelect = toppingMaxSelectCeiling.value
  }
}

// ===== HARGA KOMBINASI (filling + topping) =====
// Dropdown baris kombinasi memakai nama opsi filling/topping yang sudah diisi.
const fillingNameOptions = computed(() =>
  filling.options.map((o) => (o.name ?? '').trim()).filter((n) => n)
)
const toppingNameOptions = computed(() =>
  topping.options.map((o) => (o.name ?? '').trim()).filter((n) => n)
)
// baris kombinasi hanya relevan kalau kedua daftar opsi terisi
const canBuildCombos = computed(
  () => fillingNameOptions.value.length > 0 && toppingNameOptions.value.length > 0
)
const addComboRow = () => {
  comboRows.list.push({ filling: '', topping: '', price: 0 })
}
const removeComboRow = (index) => {
  comboRows.list.splice(index, 1)
}

const modalTitle = computed(() => {
  if (props.copy && props.product)
    return t('admin.productForm.copyTitle', { name: props.product.name })
  return isEdit.value
    ? t('admin.productForm.editTitle', { name: props.product.name })
    : t('admin.productForm.addTitle')
})

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
  clearPriceMap(boxImages)
  shapeImages.ROUND = ''
  shapeImages.SQUARE = ''
  roundMinSize.value = null
  squareMinSize.value = null
  nonCakePrice.value = null
  goodiebagPrice.value = null
  Object.assign(nonCake, { shape: 'ROUND', size: null, sizeB: null })
  clearPriceMap(nonCakeSizePrices)
  clearPriceMap(breadSizePrices)
  Object.assign(filling, { enabled: false, defaultIndex: 0, options: [] })
  Object.assign(topping, { enabled: false, maxSelect: 1, options: [] })
  comboRows.list = []

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
    // saat menyalin, beri akhiran "(Copy)" supaya nama tidak identik & mudah dikenali
    name: props.copy ? `${p.name ?? ''} (Copy)`.trim() : p.name ?? '',
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
    // CINROLLS VAN DEPOK: muat config filling & topping kalau ada
    if (usesFilling(p.subcategory) && p.filling?.options?.length) {
      Object.assign(filling, {
        enabled: true,
        defaultIndex: Number(p.filling.defaultIndex) || 0,
        options: p.filling.options.map((o) => ({ name: o.name ?? '' })),
      })
    }
    if (usesTopping(p.subcategory) && p.topping?.options?.length) {
      Object.assign(topping, {
        enabled: true,
        maxSelect: Number(p.topping.maxSelect) || 1,
        options: p.topping.options.map((o) => ({ name: o.name ?? '' })),
      })
    }
    if (usesFilling(p.subcategory) && Array.isArray(p.comboPrices)) {
      comboRows.list = p.comboPrices.map((c) => ({
        filling: c.filling ?? '',
        topping: c.topping ?? '',
        price: Number(c.price) || 0,
      }))
    }
    // Bread: harga per ukuran bernama (cocokkan variant -> key)
    if (isBreadCategory(p.category)) {
      variants.forEach((v) => {
        const s = breadSizeForVariant(v)
        if (s) breadSizePrices[s.key] = Number(v.price)
      })
      return
    }
    // Sub-kategori size-pilihan (Basque): harga per size
    if (type5SizeConfig(p.subcategory)) {
      variants.forEach((v) => {
        nonCakeSizePrices[v.size] = Number(v.price)
      })
      return
    }
    // TYPE5 biasa: 1 variant harga tunggal + shape & size
    const v = variants[0]
    nonCakePrice.value = v ? Number(v.price) : null
    Object.assign(nonCake, {
      shape: v?.shape ?? 'ROUND',
      size: v?.size ?? null,
      sizeB: v?.sizeB ?? null,
    })
    return
  }

  if (p.type === 'TYPE6') {
    // Goodiebag: satu varian harga tunggal (size null), tanpa isi box
    if (isGoodiebagCupcake(p.category)) {
      goodiebagPrice.value = variants[0] ? Number(variants[0].price) : null
      return
    }
    // TYPE6: tiap variant = satu isi box; `size` menyimpan jumlah pcs
    variants.forEach((v) => {
      boxPrices[v.size] = Number(v.price)
      if (v.image) boxImages[v.size] = v.image
    })
    return
  }

  // TYPE3 / TYPE4: turunkan min size + isi harga dari variant yang ada
  const round = variants.filter((v) => v.shape === 'ROUND')
  const square = variants.filter((v) => v.shape === 'SQUARE')

  if (round.length) {
    roundMinSize.value = Math.min(...round.map((v) => v.size))
    round.forEach((v) => (roundPrices[v.size] = Number(v.price)))
    // foto bentuk sama untuk semua ukuran; ambil yang pertama punya
    shapeImages.ROUND = round.find((v) => v.image)?.image ?? ''
  }
  if (square.length) {
    squareMinSize.value = Math.min(...square.map((v) => v.size))
    square.forEach((v) => (squarePrices[v.size] = Number(v.price)))
    shapeImages.SQUARE = square.find((v) => v.image)?.image ?? ''
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
  const [removed] = form.images.splice(index, 1)
  // Lepas foto ini dari isi box mana pun yang memakainya. Tanpa ini, varian
  // akan menunjuk URL yang sudah tidak ada di galeri dan server menolaknya.
  Object.keys(boxImages).forEach((size) => {
    if (boxImages[size] === removed) delete boxImages[size]
  })
  Object.keys(shapeImages).forEach((shape) => {
    if (shapeImages[shape] === removed) shapeImages[shape] = ''
  })
}

// jadikan foto tertentu sebagai cover (pindahkan ke posisi pertama)
const makeCover = (index) => {
  if (index <= 0) return
  const [img] = form.images.splice(index, 1)
  form.images.unshift(img)
}

// ===== URUTKAN ULANG FOTO =====
// Urutan foto menentukan cover (foto pertama) sekaligus urutan tampil di
// galeri halaman detail. Penetapan foto per box/bentuk menyimpan URL, bukan
// nomor urut, jadi menggeser foto tidak merusak penetapan itu.
const dragIndex = ref(null)

const moveImage = (from, to) => {
  if (to < 0 || to >= form.images.length || from === to) return
  const [img] = form.images.splice(from, 1)
  form.images.splice(to, 0, img)
}

const onDragStart = (index) => {
  dragIndex.value = index
}
const onDropImage = (index) => {
  if (dragIndex.value !== null) moveImage(dragIndex.value, index)
  dragIndex.value = null
}

// ===== SUBMIT =====
// TYPE5 size-pilihan (Basque): hanya size yang diberi harga > 0 dijadikan varian.
const buildNonCakeSizeVariants = () =>
  nonCakeSizes.value
    .filter((size) => Number(nonCakeSizePrices[size]) > 0)
    .map((size) => ({ size, price: Number(nonCakeSizePrices[size]) }))

const buildVariantList = () => {
  const variants = []
  // foto bentuk dilekatkan ke setiap ukuran milik bentuk tsb, supaya halaman
  // detail bisa menemukannya dari ukuran mana pun yang sedang dipilih
  for (const size of roundSizes.value) {
    const v = { shape: 'ROUND', size, price: Number(roundPrices[size]) }
    if (shapeImages.ROUND) v.image = shapeImages.ROUND
    variants.push(v)
  }
  for (const size of squareSizes.value) {
    const v = { shape: 'SQUARE', size, price: Number(squarePrices[size]) }
    if (shapeImages.SQUARE) v.image = shapeImages.SQUARE
    variants.push(v)
  }
  return variants
}

// klik thumbnail untuk menetapkan foto bentuk; klik lagi untuk melepasnya
const toggleShapeImage = (shape, url) => {
  shapeImages[shape] = shapeImages[shape] === url ? '' : url
}

// TYPE6: hanya isi box yang diberi harga > 0 yang dijadikan varian.
// Box yang dikosongkan admin dianggap tidak dijual untuk produk tsb.
const buildBoxVariants = () =>
  cupcakeBoxes.value
    .filter((size) => Number(boxPrices[size]) > 0)
    .map((size) => {
      const variant = { size, price: Number(boxPrices[size]) }
      // foto opsional; hanya dikirim kalau admin memilihnya
      if (boxImages[size]) variant.image = boxImages[size]
      return variant
    })

// klik thumbnail untuk menetapkan foto box; klik lagi untuk melepasnya
const toggleBoxImage = (size, url) => {
  if (boxImages[size] === url) delete boxImages[size]
  else boxImages[size] = url
}

// Validasi config filling (hanya kalau sub-kategori cinrolls & filling diaktifkan).
const validateFilling = () => {
  if (!usesFillingSubcat.value || !filling.enabled) return null
  if (filling.options.length === 0)
    return t('admin.productForm.fillingOptionsRequired')
  const names = filling.options.map((o) => (o.name ?? '').trim())
  if (names.some((n) => !n)) return t('admin.productForm.fillingNameRequired')
  const lower = names.map((n) => n.toLowerCase())
  if (new Set(lower).size !== lower.length)
    return t('admin.productForm.fillingNameDuplicate')
  if (filling.defaultIndex < 0 || filling.defaultIndex >= filling.options.length)
    return t('admin.productForm.fillingDefaultInvalid')
  return null
}

// Validasi daftar harga kombinasi (filling + topping).
const validateCombos = () => {
  if (!usesFillingSubcat.value) return null
  const rows = comboRows.list
  if (rows.length === 0) return null // boleh kosong (tanpa penyesuaian harga)
  const seen = new Set()
  for (const r of rows) {
    if (!r.filling || !r.topping) return t('admin.productForm.comboIncomplete')
    if (!fillingNameOptions.value.includes(r.filling))
      return t('admin.productForm.comboFillingUnknown')
    if (!toppingNameOptions.value.includes(r.topping))
      return t('admin.productForm.comboToppingUnknown')
    if (Number(r.price) < 0) return t('admin.productForm.comboPriceInvalid')
    const key = `${r.filling}||${r.topping}`
    if (seen.has(key)) return t('admin.productForm.comboDuplicate')
    seen.add(key)
  }
  return null
}

// Validasi config topping (nama saja, tanpa harga; batas jumlah pilihan user).
const validateTopping = () => {
  if (!usesToppingSubcat.value || !topping.enabled) return null
  if (topping.options.length === 0)
    return t('admin.productForm.toppingOptionsRequired')
  const names = topping.options.map((o) => (o.name ?? '').trim())
  if (names.some((n) => !n)) return t('admin.productForm.toppingNameRequired')
  const lower = names.map((n) => n.toLowerCase())
  if (new Set(lower).size !== lower.length)
    return t('admin.productForm.toppingNameDuplicate')
  const ceil = toppingMaxSelectCeiling.value
  if (!(topping.maxSelect >= 1 && topping.maxSelect <= ceil))
    return t('admin.productForm.toppingMaxInvalid')
  return null
}

const validate = () => {
  if (!form.name.trim()) return t('admin.productForm.nameRequired')
  if (!form.description.trim()) return t('admin.productForm.descriptionRequired')
  if (!form.descriptionEn.trim()) return t('admin.productForm.descriptionEnRequired')
  if (!form.images.length) return t('admin.productForm.imageRequired')
  if (!form.category) return t('admin.productForm.categoryRequired')
  if (hasSubcategory.value && !form.subcategory) return t('admin.productForm.subcategoryRequired')
  if (showFlavor.value && !form.flavor.trim()) return t('admin.productForm.flavorRequired')

  if (usesSingleVariant.value) {
    const size = Number(type1.size)
    if (!Number.isInteger(size) || size <= 0)
      return t('admin.productForm.sizeInvalid')
    if (!(Number(type1.price) > 0)) return t('admin.productForm.priceInvalid')
    return null
  }

  if (usesBread.value) {
    // minimal satu ukuran diberi harga
    if (buildBreadSizeVariants().length === 0)
      return t('admin.productForm.sizePriceRequired')
    return validateFilling() || validateTopping() || validateCombos()
  }

  if (usesNonCakeSize.value) {
    // minimal satu size diberi harga
    if (buildNonCakeSizeVariants().length === 0)
      return t('admin.productForm.sizePriceRequired')
    return null
  }

  if (usesNonCake.value) {
    const size = Number(nonCake.size)
    if (!Number.isInteger(size) || size <= 0)
      return t('admin.productForm.sizeInvalid')
    if (nonCake.shape === 'SQUARE') {
      const sizeB = Number(nonCake.sizeB)
      if (!Number.isInteger(sizeB) || sizeB <= 0)
        return t('admin.productForm.sizeInvalid')
    }
    if (!(Number(nonCakePrice.value) > 0)) return t('admin.productForm.priceInvalid')
    return validateFilling() || validateTopping() || validateCombos()
  }

  if (usesGoodiebag.value) {
    if (!(Number(goodiebagPrice.value) > 0)) return t('admin.productForm.priceInvalid')
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

// Tempelkan config filling & topping + harga kombinasi ke payload (cinrolls).
// null = kosongkan (mis. saat filling/topping dinonaktifkan atau bukan cinrolls).
const attachFillingTopping = (payload) => {
  if (usesFillingSubcat.value) {
    payload.filling =
      filling.enabled && filling.options.length
        ? {
            options: filling.options.map((o) => ({ name: o.name.trim() })),
            defaultIndex: Number(filling.defaultIndex) || 0,
          }
        : null
    payload.comboPrices =
      filling.enabled && comboRows.list.length
        ? comboRows.list.map((r) => ({
            filling: r.filling,
            topping: r.topping,
            price: Number(r.price) || 0,
          }))
        : null
  }
  if (usesToppingSubcat.value) {
    payload.topping =
      topping.enabled && topping.options.length
        ? {
            options: topping.options.map((o) => ({ name: o.name.trim() })),
            maxSelect: Number(topping.maxSelect) || 1,
          }
        : null
  }
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

  if (usesNonCakeSize.value) {
    // sub-kategori size-pilihan (Basque): kirim variants per size
    return {
      ...base,
      type: 'TYPE5',
      subcategory: form.subcategory,
      flavor: form.flavor.trim(),
      variants: buildNonCakeSizeVariants(),
    }
  }

  if (usesBread.value) {
    // Bread: user memilih ukuran bernama; kirim harga per ukuran (+ filling/topping cinrolls)
    const payload = {
      ...base,
      type: 'TYPE5',
      subcategory: form.subcategory,
      flavor: form.flavor.trim(),
      breadSizes: buildBreadSizeVariants(),
    }
    attachFillingTopping(payload)
    return payload
  }

  if (usesNonCake.value) {
    const payload = {
      ...base,
      type: 'TYPE5',
      // kategori tanpa sub-kategori tidak mengirim field subcategory
      subcategory: hasSubcategory.value ? form.subcategory : undefined,
      flavor: form.flavor.trim(),
      shape: nonCake.shape,
      size: Number(nonCake.size),
      // dimensi kedua hanya untuk SQUARE
      sizeB: nonCake.shape === 'SQUARE' ? Number(nonCake.sizeB) : undefined,
      price: Number(nonCakePrice.value),
    }
    attachFillingTopping(payload)
    return payload
  }

  if (usesCupcake.value) {
    // goodiebag = satu varian harga tunggal (tanpa size); lainnya = varian per isi box
    const variants = usesGoodiebag.value
      ? [{ price: Number(goodiebagPrice.value) }]
      : buildBoxVariants()
    const payload = { ...base, type: 'TYPE6', variants }
    // goodiebag membawa sub-kategori (menentukan pilihan rasa pembeli)
    if (usesGoodiebag.value) payload.subcategory = form.subcategory
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
  <!-- Dipindah ke <body>: modal ini berada di dalam <main> yang punya
       pembungkus beranimasi (.tc-page), dan ancestor beranimasi/ber-transform
       mengurung `position: fixed` di dalamnya — akibatnya overlay hanya
       menggelapkan area konten, sidebar tidak ikut. Di body, overlay benar-benar
       menutupi seluruh layar.
       z-[55]: di atas tombol WhatsApp (z-50), di bawah ConfirmDialog (z-[60])
       supaya dialog konfirmasi hapus tetap tampil di atas modal ini. -->
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[55] flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto"
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

        <!-- SUBCATEGORY (TYPE5 non-cake & Goodiebag; hanya kategori ber-sub-kategori) -->
        <div v-if="hasSubcategory">
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
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent
              @drop="onDropImage(index)"
              @dragend="dragIndex = null"
              class="relative aspect-square rounded-lg border overflow-hidden bg-cream-100 group cursor-grab active:cursor-grabbing"
              :class="[
                index === 0 ? 'border-brand-500 ring-1 ring-brand-500' : 'border-cream-300',
                dragIndex === index ? 'opacity-40' : '',
              ]"
            >
              <button type="button" @click="makeCover(index)" class="w-full h-full" :title="t('admin.productForm.setAsCover')">
                <img :src="img" alt="Preview" class="w-full h-full object-cover" draggable="false" />
              </button>

              <!-- nomor posisi, supaya urutan mudah dibaca saat menggeser -->
              <span
                class="absolute top-1 left-1 w-5 h-5 rounded-full bg-cocoa-900/70 text-white text-[10px] font-bold flex items-center justify-center pointer-events-none"
              >
                {{ index + 1 }}
              </span>

              <!-- geser satu langkah; alternatif drag untuk layar sentuh -->
              <button
                v-if="index > 0"
                type="button"
                @click.stop="moveImage(index, index - 1)"
                class="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-7 rounded bg-white/90 border border-cream-300 text-cocoa-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-brand-600 transition"
                :aria-label="t('admin.productForm.moveImageLeft')"
              >
                <ChevronLeft class="w-3.5 h-3.5" />
              </button>
              <button
                v-if="index < form.images.length - 1"
                type="button"
                @click.stop="moveImage(index, index + 1)"
                class="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-7 rounded bg-white/90 border border-cream-300 text-cocoa-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-brand-600 transition"
                :aria-label="t('admin.productForm.moveImageRight')"
              >
                <ChevronRight class="w-3.5 h-3.5" />
              </button>

              <span
                v-if="index === 0"
                class="absolute bottom-0 inset-x-0 bg-brand-500 text-white text-[10px] font-semibold text-center py-0.5 pointer-events-none"
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

        <!-- ===== TYPE5 (non-cake): shape+size tunggal ATAU harga per size (Basque) ===== -->
        <template v-if="usesNonCake">
          <!-- Sub-kategori size-pilihan (Basque): admin isi harga per ukuran -->
          <template v-if="usesNonCakeSize">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
                {{ t('admin.productForm.sizePrices') }}
              </label>
              <p class="text-xs text-cocoa-400 mb-2">
                {{ t('admin.productForm.sizePriceHint') }}
              </p>
              <div class="rounded-2xl border border-cream-300 p-4 space-y-4">
                <div v-for="s in nonCakeSizes" :key="`sz-${s}`">
                  <p class="text-sm mb-1">{{ s }} cm</p>
                  <PriceInput
                    v-model="nonCakeSizePrices[s]"
                    class="w-full rounded-full border border-cream-300 px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
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

          <!-- Bread: harga per ukuran bernama (dimensi tetap) -->
          <template v-else-if="usesBread">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
                {{ t('admin.productForm.breadSizePrices') }}
              </label>
              <p class="text-xs text-cocoa-400 mb-2">
                {{ t('admin.productForm.breadSizeHint') }}
              </p>
              <div class="rounded-2xl border border-cream-300 p-4 space-y-4">
                <div v-for="s in breadSizeList" :key="s.key">
                  <p class="text-sm mb-1">
                    <span class="font-semibold text-cocoa-900">{{ s.label }}</span>
                    <span class="text-cocoa-400"> · {{ s.desc }}</span>
                  </p>
                  <PriceInput
                    v-model="breadSizePrices[s.key]"
                    class="w-full rounded-full border border-cream-300 px-4 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
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

          <!-- Sub-kategori biasa: shape + size tunggal + harga -->
          <template v-else>
          <!-- SHAPE -->
          <div>
            <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.shape') }}</label>
            <div class="relative">
              <select
                v-model="nonCake.shape"
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

          <!-- SIZE: ROUND satu angka, SQUARE dua angka (mis. 20 x 10) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
                {{ nonCake.shape === 'SQUARE' ? t('admin.productForm.size1') : t('admin.productForm.size') }}
              </label>
              <input
                v-model.number="nonCake.size"
                type="number"
                min="1"
                :placeholder="t('admin.productForm.sizePlaceholder')"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div v-if="nonCake.shape === 'SQUARE'">
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.size2') }}</label>
              <input
                v-model.number="nonCake.sizeB"
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

          <!-- ===== FILLING (khusus CINROLLS VAN DEPOK) ===== -->
          <div v-if="usesFillingSubcat" class="border-t border-cream-200 pt-4">
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" v-model="filling.enabled" class="w-4 h-4 accent-brand-500" />
              <span class="text-sm font-bold text-cocoa-900">{{ t('admin.productForm.fillingEnable') }}</span>
            </label>
            <p class="text-xs text-cocoa-400 mt-1">{{ t('admin.productForm.fillingHint') }}</p>

            <div v-if="filling.enabled" class="mt-4 space-y-3">
              <!-- daftar opsi filling -->
              <div class="space-y-2">
                <div
                  v-for="(opt, i) in filling.options"
                  :key="i"
                  class="flex items-center gap-2"
                >
                  <label
                    class="flex items-center gap-1.5 shrink-0 cursor-pointer"
                    :title="t('admin.productForm.fillingDefaultHint')"
                  >
                    <input type="radio" :value="i" v-model.number="filling.defaultIndex" class="accent-brand-500" />
                    <span class="text-[11px] font-semibold text-cocoa-400">{{ t('admin.productForm.fillingDefault') }}</span>
                  </label>
                  <input
                    v-model="opt.name"
                    type="text"
                    :placeholder="t('admin.productForm.fillingNamePlaceholder')"
                    class="flex-1 min-w-0 rounded-full border border-cream-300 px-3.5 py-2 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    @click="removeFillingOption(i)"
                    class="shrink-0 p-2 rounded-lg border border-cream-300 text-cocoa-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    :aria-label="t('admin.productForm.fillingRemoveOption')"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
                <p v-if="filling.options.length === 0" class="text-xs text-cocoa-400 italic">
                  {{ t('admin.productForm.fillingOptionsRequired') }}
                </p>
              </div>

              <button
                type="button"
                @click="addFillingOption"
                :disabled="!canAddFillingOption"
                class="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Plus class="w-4 h-4" stroke-width="2.4" />
                {{ t('admin.productForm.fillingAddOption') }} ({{ filling.options.length }}/{{ MAX_FILLING_OPTIONS }})
              </button>
            </div>
          </div>

          <!-- ===== TOPPING (khusus CINROLLS VAN DEPOK) ===== -->
          <div v-if="usesToppingSubcat" class="border-t border-cream-200 pt-4">
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" v-model="topping.enabled" class="w-4 h-4 accent-brand-500" />
              <span class="text-sm font-bold text-cocoa-900">{{ t('admin.productForm.toppingEnable') }}</span>
            </label>
            <p class="text-xs text-cocoa-400 mt-1">{{ t('admin.productForm.toppingHint') }}</p>

            <div v-if="topping.enabled" class="mt-4 space-y-3">
              <!-- daftar opsi topping (nama saja, tanpa harga) -->
              <div class="space-y-2">
                <div
                  v-for="(opt, i) in topping.options"
                  :key="i"
                  class="flex items-center gap-2"
                >
                  <input
                    v-model="opt.name"
                    type="text"
                    :placeholder="t('admin.productForm.toppingNamePlaceholder')"
                    class="flex-1 min-w-0 rounded-full border border-cream-300 px-3.5 py-2 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    @click="removeToppingOption(i)"
                    class="shrink-0 p-2 rounded-lg border border-cream-300 text-cocoa-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    :aria-label="t('admin.productForm.toppingRemoveOption')"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
                <p v-if="topping.options.length === 0" class="text-xs text-cocoa-400 italic">
                  {{ t('admin.productForm.toppingOptionsRequired') }}
                </p>
              </div>

              <button
                type="button"
                @click="addToppingOption"
                :disabled="!canAddToppingOption"
                class="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Plus class="w-4 h-4" stroke-width="2.4" />
                {{ t('admin.productForm.toppingAddOption') }} ({{ topping.options.length }}/{{ MAX_TOPPING_OPTIONS }})
              </button>

              <!-- batas jumlah pilihan user -->
              <div class="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">{{ t('admin.productForm.toppingMaxSelect') }}</label>
                  <input
                    v-model.number="topping.maxSelect"
                    type="number"
                    min="1"
                    :max="toppingMaxSelectCeiling"
                    class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
                  />
                  <p class="text-xs text-cocoa-400 mt-1">{{ t('admin.productForm.toppingMaxHint', { max: MAX_TOPPING_SELECT }) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== HARGA KOMBINASI (filling + topping) ===== -->
          <div
            v-if="usesFillingSubcat && filling.enabled && topping.enabled"
            class="border-t border-cream-200 pt-4"
          >
            <p class="text-sm font-bold text-cocoa-900">{{ t('admin.productForm.comboTitle') }}</p>
            <p class="text-xs text-cocoa-400 mt-1">{{ t('admin.productForm.comboHint') }}</p>

            <p v-if="!canBuildCombos" class="text-xs text-cocoa-400 italic mt-3">
              {{ t('admin.productForm.comboNeedOptions') }}
            </p>
            <div v-else class="mt-3 space-y-2">
              <div
                v-for="(row, i) in comboRows.list"
                :key="i"
                class="flex items-center gap-2"
              >
                <div class="relative flex-1 min-w-0">
                  <select
                    v-model="row.filling"
                    class="appearance-none w-full rounded-full border border-cream-300 bg-white px-3.5 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>{{ t('admin.productForm.comboFillingPlaceholder') }}</option>
                    <option v-for="n in fillingNameOptions" :key="n" :value="n">{{ n }}</option>
                  </select>
                  <ChevronDown class="w-4 h-4 text-cocoa-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span class="shrink-0 text-cocoa-400 text-xs font-bold">+</span>
                <div class="relative flex-1 min-w-0">
                  <select
                    v-model="row.topping"
                    class="appearance-none w-full rounded-full border border-cream-300 bg-white px-3.5 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>{{ t('admin.productForm.comboToppingPlaceholder') }}</option>
                    <option v-for="n in toppingNameOptions" :key="n" :value="n">{{ n }}</option>
                  </select>
                  <ChevronDown class="w-4 h-4 text-cocoa-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <PriceInput
                  v-model="row.price"
                  class="w-28 shrink-0 rounded-full border border-cream-300 px-3.5 py-2 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  @click="removeComboRow(i)"
                  class="shrink-0 p-2 rounded-lg border border-cream-300 text-cocoa-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  :aria-label="t('admin.productForm.comboRemoveRow')"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                @click="addComboRow"
                class="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:opacity-70 transition-opacity"
              >
                <Plus class="w-4 h-4" stroke-width="2.4" />
                {{ t('admin.productForm.comboAddRow') }}
              </button>
            </div>
          </div>
        </template>

        <!-- ===== TYPE6 goodiebag: harga tunggal per box + discount ===== -->
        <template v-if="usesGoodiebag">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
                {{ t('admin.productForm.pricePerBox') }}
              </label>
              <PriceInput
                v-model="goodiebagPrice"
                class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
              />
              <p class="text-xs text-cocoa-400 mt-1.5">
                {{ t('admin.productForm.goodiebagHint', { count: goodiebagMin }) }}
              </p>
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
        <template v-else-if="usesCupcake">
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
              <div class="rounded-2xl border border-cream-300 p-4 space-y-4">
                <div v-for="b in cupcakeBoxes" :key="`box-${b}`">
                  <p class="text-sm mb-1">{{ t('product.boxOf', { count: b }) }}</p>
                  <PriceInput
                    v-model="boxPrices[b]"
                    class="w-full rounded-full border border-cream-300 px-4 py-2 text-sm focus:outline-none"
                  />

                  <!-- Foto yang mewakili isi box ini, dipilih dari foto yang
                       sudah diunggah di atas. Opsional. -->
                  <template v-if="form.images.length">
                    <p class="text-xs text-cocoa-400 mt-2 mb-1.5">
                      {{ t('admin.productForm.boxImageHint') }}
                    </p>
                    <div class="flex gap-2 flex-wrap">
                      <button
                        v-for="(img, i) in form.images"
                        :key="`box-${b}-img-${i}`"
                        type="button"
                        @click="toggleBoxImage(b, img)"
                        class="w-11 aspect-square rounded-lg border-2 overflow-hidden transition-colors bg-cream-100"
                        :class="boxImages[b] === img
                          ? 'border-brand-500'
                          : 'border-transparent hover:border-brand-400'"
                        :title="t('admin.productForm.boxImageHint')"
                      >
                        <img :src="img" alt="" class="w-full h-full object-cover" />
                      </button>
                    </div>
                  </template>
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

            <!-- FOTO UNTUK BENTUK ROUND (opsional) -->
            <div v-if="roundSizes.length && form.images.length" class="mt-3">
              <label class="block text-xs font-semibold text-cocoa-500 mb-1.5">
                {{ t('admin.productForm.shapeImageHint') }}
              </label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="(img, i) in form.images"
                  :key="`round-img-${i}`"
                  type="button"
                  @click="toggleShapeImage('ROUND', img)"
                  class="w-11 aspect-square rounded-lg border-2 overflow-hidden transition-colors bg-cream-100"
                  :class="shapeImages.ROUND === img
                    ? 'border-brand-500'
                    : 'border-transparent hover:border-brand-400'"
                >
                  <img :src="img" alt="" class="w-full h-full object-cover" />
                </button>
              </div>
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

            <!-- FOTO UNTUK BENTUK SQUARE (opsional) -->
            <div v-if="squareSizes.length && form.images.length" class="mt-3">
              <label class="block text-xs font-semibold text-cocoa-500 mb-1.5">
                {{ t('admin.productForm.shapeImageHint') }}
              </label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="(img, i) in form.images"
                  :key="`square-img-${i}`"
                  type="button"
                  @click="toggleShapeImage('SQUARE', img)"
                  class="w-11 aspect-square rounded-lg border-2 overflow-hidden transition-colors bg-cream-100"
                  :class="shapeImages.SQUARE === img
                    ? 'border-brand-500'
                    : 'border-transparent hover:border-brand-400'"
                >
                  <img :src="img" alt="" class="w-full h-full object-cover" />
                </button>
              </div>
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
  </Teleport>
</template>
