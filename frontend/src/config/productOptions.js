// src/config/productOptions.js

/**
 * Katalog aturan produk sisi frontend: kategori, sub-kategori, daftar rasa,
 * ukuran roti, dan konfigurasi cupcake.
 *
 * SELURUH isi berkas ini adalah salinan dari backend
 * (src/features/product/product.constant.js dan product.helper.js).
 * Tujuannya supaya form admin hanya menawarkan pilihan yang pasti diterima
 * server, dan halaman produk bisa menampilkan pilihan tanpa menunggu balasan.
 *
 * Karena itu: menambah kategori atau rasa baru berarti menyunting DUA berkas.
 * Kalau hanya salah satu yang diubah, admin bisa memilih sesuatu yang lalu
 * ditolak server — atau sebaliknya, pilihan yang sah tidak pernah muncul.
 */

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'TYPE1', label: 'Type 1 (Signature Collection)' },
  { value: 'TYPE2', label: 'Type 2 (Flavor & Design Choice)' },
  { value: 'TYPE3', label: 'Type 3 (Choose Your Size)' },
  { value: 'TYPE4', label: 'Type 4 (Fully Custom Cake)' },
  { value: 'TYPE5', label: 'Type 5 (Non-Cake)' },
  { value: 'TYPE6', label: 'Type 6 (Cupcakes)' },
]

// Kategori yang sah untuk tiap tipe produk
export const PRODUCT_CATEGORIES = {
  TYPE1: ['Signature Petite Cake Series', 'Signature Shortcake Series'],
  TYPE2: ['Simple Decor Petite Cake', 'Paper Topper Petite Cake', 'Custom 2D Petite Cake'],
  TYPE3: [
    'Signature Original Cake Series',
    'Signature Royal Cake',
    'Signature Tropical Fruit Cake',
  ],
  TYPE4: [
    'Custom Paper Topper Cake',
    'Custom Edible Photo Cake',
    'Custom Exclusive Figurine Cake',
    'Custom Figurine Fondant Cake',
    'Custom 3D Cake Fondant',
    'Signature Simple Custom Decor',
    'Signature Premium Custom Decor',
    'Signature Royal Custom Decor',
    'Signature Simple Roses Cake',
  ],
  // TYPE5 bertingkat dua: kategori di sini, sub-kategorinya di bawah
  TYPE5: ['Bread', 'Cheese Cake', 'Brownies'],
  // Tiap kategori cupcake punya aturan sendiri, lihat TYPE6_CATEGORY_CONFIG
  TYPE6: [
    'American Butter Cupcakes',
    'Simple Decor Cupcakes',
    'Paper Topper Cupcakes',
    'Custom 3D Cupcakes',
    'Goodiebag Cupcakes',
  ],
}

// Sub-kategori TYPE5, dikelompokkan menurut kategori induknya
export const TYPE5_SUBCATEGORIES = {
  Bread: ['CINROLLS VAN DEPOK', 'MOZZARELLA SAUSAGE ROLLS'],
  'Cheese Cake': ['BASQUE BURNT CHEESE CAKE'],
  Brownies: [
    'SIGNATURE PREMIUM FUDGE BROWNIES',
    'SIGNATURE ASSORTED BROWNIES BOX',
    'SIGNATURE CUSTOM BROWNIES BOX',
  ],
}

// Kategori yang tidak terdaftar di atas berarti tidak bertingkat dua,
// jadi form admin tidak menampilkan pilihan sub-kategori untuknya
export const type5HasSubcategories = (category) =>
  (TYPE5_SUBCATEGORIES[category]?.length ?? 0) > 0

// Sub-kategori yang ukurannya dipilih pembeli, tiap ukuran punya harga sendiri
export const TYPE5_SIZE_SUBCATEGORIES = {
  'BASQUE BURNT CHEESE CAKE': { shape: 'ROUND', sizes: [14, 16, 18, 20] },
}

export const type5SizeConfig = (subcategory) =>
  TYPE5_SIZE_SUBCATEGORIES[subcategory] ?? null

export const isType5SizeSubcategory = (subcategory) =>
  Object.prototype.hasOwnProperty.call(TYPE5_SIZE_SUBCATEGORIES, subcategory)

// ===== ROTI =====
// Ukurannya bernama dengan dimensi yang sudah ditetapkan, jadi admin hanya
// mengisi harga tiap ukuran — bukan mengetik dimensinya.
export const BREAD_CATEGORY = 'Bread'
export const isBreadCategory = (category) => category === BREAD_CATEGORY

export const BREAD_SIZES = [
  { key: 'PERSONAL', label: 'Personal Size', shape: 'SQUARE', size: 22, sizeB: 10 },
  { key: 'FAMILY', label: 'Family Size', shape: 'ROUND', size: 25, sizeB: null },
  { key: 'SHARING', label: 'Sharing Size', shape: null, size: 9, sizeB: null },
]

export const breadSizeByKey = (key) => BREAD_SIZES.find((s) => s.key === key) ?? null

// Kebalikannya: dari sebuah varian, cari ukuran roti mana yang cocok.
// Dipakai untuk menampilkan kembali nama ukurannya ("Family Size") dari data
// yang tersimpan, karena yang masuk DB hanyalah dimensinya.
export const breadSizeForVariant = (v) =>
  BREAD_SIZES.find(
    (s) =>
      s.shape === (v.shape ?? null) &&
      s.size === (v.size ?? null) &&
      (s.sizeB ?? null) === (v.sizeB ?? null),
  ) ?? null

// ===== FILLING & TOPPING =====
// Sejauh ini hanya Cinrolls yang memakainya. Kedua fungsi di bawah dibuat
// terpisah walau isinya sama, supaya nanti bisa diperluas sendiri-sendiri.
export const CINROLLS_VAN_DEPOK = 'CINROLLS VAN DEPOK'
export const MAX_FILLING_OPTIONS = 6 // batas jumlah pilihan yang boleh dibuat admin
export const MAX_TOPPING_OPTIONS = 6
export const MAX_TOPPING_SELECT = 3 // batas jumlah topping yang boleh dipilih pembeli

export const usesFilling = (subcategory) => subcategory === CINROLLS_VAN_DEPOK
export const usesTopping = (subcategory) => subcategory === CINROLLS_VAN_DEPOK

// ===== CUPCAKE =====
// Nama rasanya sengaja diberi akhiran "Cupcakes" supaya tidak tertukar dengan
// rasa kue yang namanya mirip — keduanya punya penjelasan berbeda di
// constants.js. Semua kategori cupcake memakai daftar rasa yang sama; yang
// membedakan hanya pilihan isi box dan siapa yang menentukan rasanya.
export const CUPCAKE_FLAVORS = [
  'Double Choco Cupcakes',
  'Choco Blueberry Cupcakes',
  'Vanilla Cheese Cupcakes',
  'Vanilla Strawberry Cupcakes',
]

// Goodiebag Original punya daftar rasanya sendiri, terpisah dari cupcake biasa
export const ORIGINAL_GOODIEBAG_FLAVORS = [
  'Strawberry Marshmallow',
  'Double Cheese',
  'Vanilla Oreo',
  'Happy Blueberry',
  'Vanilla Biscoff',
  'Vanilla Greentea',
  'Double Choco',
  'Choco Oreo',
  'Nutella',
  'Choco Blueberry',
]

/**
 * Dua macam goodiebag, masing-masing dengan daftar rasa & batas pilihannya:
 * Original boleh 1 sampai 4 rasa, Custom tepat satu rasa.
 * Admin membuat produk goodiebag terpisah untuk tiap sub-kategori.
 */
export const GOODIEBAG_SUBCATEGORIES = {
  'Original Goodiebag': { flavors: ORIGINAL_GOODIEBAG_FLAVORS, minFlavors: 1, maxFlavors: 4 },
  'Custom Goodiebag': { flavors: CUPCAKE_FLAVORS, minFlavors: 1, maxFlavors: 1 },
}

export const goodiebagSubcategories = () => Object.keys(GOODIEBAG_SUBCATEGORIES)

export const goodiebagFlavorsForSubcategory = (subcategory) =>
  GOODIEBAG_SUBCATEGORIES[subcategory]?.flavors ?? []

// Batas rasa per sub-kategori goodiebag. Nilai bawaannya 1 rasa, dipakai
// kalau sub-kategorinya tidak dikenal.
export const goodiebagFlavorLimit = (subcategory) => ({
  min: GOODIEBAG_SUBCATEGORIES[subcategory]?.minFlavors ?? 1,
  max: GOODIEBAG_SUBCATEGORIES[subcategory]?.maxFlavors ?? 1,
})

export const isGoodiebagSubcategory = (subcategory) =>
  Object.prototype.hasOwnProperty.call(GOODIEBAG_SUBCATEGORIES, subcategory)

/**
 * Aturan tiap kategori cupcake:
 * - fixedFlavor : true berarti rasanya ditetapkan admin, pembeli tidak memilih
 * - flavors     : rasa yang boleh dipilih pembeli
 * - boxes       : pilihan isi box yang tersedia
 */
export const TYPE6_CATEGORY_CONFIG = {
  // Satu-satunya yang rasanya ditetapkan admin, karena itu `flavors` kosong
  'American Butter Cupcakes': { fixedFlavor: true, flavors: [], boxes: [2, 4, 6, 9, 12] },
  'Simple Decor Cupcakes': {
    fixedFlavor: false,
    flavors: CUPCAKE_FLAVORS,
    boxes: [4, 6, 9, 12],
  },
  'Paper Topper Cupcakes': {
    fixedFlavor: false,
    flavors: CUPCAKE_FLAVORS,
    boxes: [6, 9, 12],
  },
  'Custom 3D Cupcakes': {
    fixedFlavor: false,
    flavors: CUPCAKE_FLAVORS,
    boxes: [4, 6, 9, 12],
  },
  // Goodiebag berbeda sendiri: dijual per paket dengan harga tunggal, jadi
  // `boxes` kosong. Rasanya juga kosong di sini karena ditentukan
  // sub-kategorinya (lihat GOODIEBAG_SUBCATEGORIES).
  'Goodiebag Cupcakes': {
    fixedFlavor: false,
    flavors: [],
    boxes: [],
    goodiebag: true,
    minQty: 10,
    multiFlavor: true,
    minFlavors: 1,
    maxFlavors: 4,
  },
}

export const cupcakeFlavorsForCategory = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.flavors ?? []

export const cupcakeBoxesForCategory = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.boxes ?? []

export const isFixedFlavorCupcake = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.fixedFlavor === true

export const isGoodiebagCupcake = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.goodiebag === true

// Pembelian minimal. Kategori biasa tidak punya batas, jadi bawaannya 1.
export const goodiebagMinQty = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.minQty ?? 1

// Kategori yang rasanya boleh dipilih lebih dari satu
export const isMultiFlavorCupcake = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.multiFlavor === true

export const cupcakeFlavorLimit = (category) => ({
  min: TYPE6_CATEGORY_CONFIG[category]?.minFlavors ?? 1,
  max: TYPE6_CATEGORY_CONFIG[category]?.maxFlavors ?? 1,
})

export const SHAPE_OPTIONS = [
  { value: 'ROUND', label: 'Round' },
  { value: 'SQUARE', label: 'Square' },
]

// ===== UKURAN KUE =====
// Ukuran terkecil yang boleh dipilih admin, lalu naik kelipatan 2 sampai 30cm.
// Bulat boleh mulai lebih kecil daripada kotak.
export const ROUND_MIN_OPTIONS = [16, 18, 20]
export const SQUARE_MIN_OPTIONS = [18, 20]
export const MAX_SIZE = 30

// Dari ukuran terkecil, hasilkan seluruh ukuran sampai 30cm.
// Contoh: generateSizeRange(18) -> [18, 20, 22, 24, 26, 28, 30]
export const generateSizeRange = (minSize) => {
  const sizes = []
  for (let s = minSize; s <= MAX_SIZE; s += 2) sizes.push(s)
  return sizes
}

// TYPE1 ukurannya diketik admin, tapi tetap ditawarkan daftar genap 16–30
// supaya seragam dengan tipe lain
export const TYPE1_SIZE_OPTIONS = generateSizeRange(16)

// Penulisan ukuran kue: bulat "16 cm", kotak "16×16 cm"
export const sizeLabel = (shape, size) =>
  shape === 'SQUARE' ? `${size}×${size} cm` : `${size} cm`

// Sama seperti di atas, tapi untuk produk yang sisi kotaknya bisa berbeda
// (mis. roti 22×10 cm). Kalau sisi kedua tidak diisi, dianggap bujur sangkar.
export const variantSizeLabel = (shape, size, sizeB = null) => {
  if (size == null) return ''
  if (shape === 'SQUARE') return `${size}×${sizeB ?? size} cm`
  return `${size} cm`
}
