// src/config/productOptions.js
// Mirror aturan size dari backend (product.helper.js) supaya form admin
// hanya memunculkan pilihan yang pasti lolos validasi server.

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'TYPE1', label: 'Type 1 (Signature Collection)' },
  { value: 'TYPE2', label: 'Type 2 (Flavor & Design Choice)' },
  { value: 'TYPE3', label: 'Type 3 (Choose Your Size)' },
  { value: 'TYPE4', label: 'Type 4 (Fully Custom Cake)' },
  { value: 'TYPE5', label: 'Type 5 (Non-Cake)' },
  { value: 'TYPE6', label: 'Type 6 (Cupcakes)' },
]

// mirror dari backend product.constant.js -> PRODUCT_CATEGORIES
// (daftar kategori yang valid per product type)
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
  // TYPE5 (non-cake): kategori level-1; sub-kategori di TYPE5_SUBCATEGORIES
  TYPE5: ['Bread', 'Cheese Cake', 'Brownies'],
  // TYPE6 (cupcakes): aturan rasa & isi box per kategori di TYPE6_CATEGORY_CONFIG
  TYPE6: [
    'American Butter Cupcakes',
    'Simple Decor Cupcakes',
    'Paper Topper Cupcakes',
    'Custom 3D Cupcakes',
    'Goodiebag Cupcakes',
  ],
}

// mirror dari backend product.constant.js -> TYPE5_SUBCATEGORIES
// sub-kategori (level-2) TYPE5 dikelompokkan per kategori level-1
export const TYPE5_SUBCATEGORIES = {
  Bread: ['CINROLLS VAN DEPOK', 'MOZZARELLA SAUSAGE ROLLS'],
  'Cheese Cake': ['BASQUE BURNT CHEESE CAKE'],
  Brownies: [
    'SIGNATURE PREMIUM FUDGE BROWNIES',
    'SIGNATURE ASSORTED BROWNIES BOX',
    'SIGNATURE CUSTOM BROWNIES BOX',
  ],
  // "Mozzarella Sausage Rolls" sengaja tidak didaftar -> tanpa sub-kategori
}

// Apakah kategori TYPE5 ini punya sub-kategori? Kategori tanpa entri di
// TYPE5_SUBCATEGORIES tidak memakai subcategory.
export const type5HasSubcategories = (category) =>
  (TYPE5_SUBCATEGORIES[category]?.length ?? 0) > 0

// Sub-kategori TYPE5 yang size-nya dipilih user (harga per size). Mirror backend.
export const TYPE5_SIZE_SUBCATEGORIES = {
  'BASQUE BURNT CHEESE CAKE': { shape: 'ROUND', sizes: [14, 16, 18, 20] },
}

export const type5SizeConfig = (subcategory) =>
  TYPE5_SIZE_SUBCATEGORIES[subcategory] ?? null

export const isType5SizeSubcategory = (subcategory) =>
  Object.prototype.hasOwnProperty.call(TYPE5_SIZE_SUBCATEGORIES, subcategory)

// mirror dari backend product.constant.js -> TYPE6_CATEGORY_CONFIG
// Rasa cupcake memakai nama tersendiri (berakhiran "Cupcakes") supaya tidak
// tertukar dengan rasa cake yang namanya mirip. Seluruh kategori cupcake
// berbagi daftar yang sama; yang berbeda hanya pilihan isi box dan apakah
// rasanya ditentukan admin (American Butter).
export const CUPCAKE_FLAVORS = [
  'Double Choco Cupcakes',
  'Choco Blueberry Cupcakes',
  'Vanilla Cheese Cupcakes',
  'Vanilla Strawberry Cupcakes',
]

// Rasa Goodiebag sub-kategori "Original Goodiebag". Mirror dari backend.
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

// Dua sub-kategori Goodiebag Cupcakes: daftar rasa + batas jumlah rasa yang boleh
// dipilih pembeli (Original: 1-4 rasa; Custom: tepat 1 rasa). Admin membuat produk
// goodiebag per sub-kategori. Mirror dari backend product.constant.js.
export const GOODIEBAG_SUBCATEGORIES = {
  'Original Goodiebag': { flavors: ORIGINAL_GOODIEBAG_FLAVORS, minFlavors: 1, maxFlavors: 4 },
  'Custom Goodiebag': { flavors: CUPCAKE_FLAVORS, minFlavors: 1, maxFlavors: 1 },
}

export const goodiebagSubcategories = () => Object.keys(GOODIEBAG_SUBCATEGORIES)

export const goodiebagFlavorsForSubcategory = (subcategory) =>
  GOODIEBAG_SUBCATEGORIES[subcategory]?.flavors ?? []

// Batas jumlah rasa yang boleh dipilih untuk satu sub-kategori goodiebag.
export const goodiebagFlavorLimit = (subcategory) => ({
  min: GOODIEBAG_SUBCATEGORIES[subcategory]?.minFlavors ?? 1,
  max: GOODIEBAG_SUBCATEGORIES[subcategory]?.maxFlavors ?? 1,
})

export const isGoodiebagSubcategory = (subcategory) =>
  Object.prototype.hasOwnProperty.call(GOODIEBAG_SUBCATEGORIES, subcategory)

export const TYPE6_CATEGORY_CONFIG = {
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
  // Goodiebag: harga tunggal per box (tanpa pilihan isi box). Punya sub-kategori
  // (lihat GOODIEBAG_SUBCATEGORIES); pilihan rasa mengikuti sub-kategori produk.
  // User memilih 1-4 rasa, minimal beli 10 box.
  'Goodiebag Cupcakes': {
    fixedFlavor: false,
    flavors: [], // rasa ditentukan per sub-kategori
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

// Kategori goodiebag: harga tunggal per box, tanpa pilihan isi box.
export const isGoodiebagCupcake = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.goodiebag === true

// Jumlah box minimum (default 1 untuk kategori non-goodiebag).
export const goodiebagMinQty = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.minQty ?? 1

// Kategori dengan pilihan rasa jamak (mis. goodiebag: 1-4 rasa).
export const isMultiFlavorCupcake = (category) =>
  TYPE6_CATEGORY_CONFIG[category]?.multiFlavor === true

// Batas jumlah rasa yang boleh dipilih untuk kategori rasa-jamak.
export const cupcakeFlavorLimit = (category) => ({
  min: TYPE6_CATEGORY_CONFIG[category]?.minFlavors ?? 1,
  max: TYPE6_CATEGORY_CONFIG[category]?.maxFlavors ?? 1,
})

export const SHAPE_OPTIONS = [
  { value: 'ROUND', label: 'Round' },
  { value: 'SQUARE', label: 'Square' },
]

// min size yang boleh dipilih per shape (samakan dgn ROUND/SQUARE_MIN_OPTIONS backend)
export const ROUND_MIN_OPTIONS = [16, 18, 20]
export const SQUARE_MIN_OPTIONS = [18, 20]
export const MAX_SIZE = 30

// generate [min, min+2, ..., 30]
export const generateSizeRange = (minSize) => {
  const sizes = []
  for (let s = minSize; s <= MAX_SIZE; s += 2) sizes.push(s)
  return sizes
}

// TYPE1 pakai satu size manual; tawarkan pilihan genap 16..30 biar konsisten
export const TYPE1_SIZE_OPTIONS = generateSizeRange(16)

// label size sesuai shape: ROUND -> "16 cm", SQUARE -> "16×16 cm"
export const sizeLabel = (shape, size) =>
  shape === 'SQUARE' ? `${size}×${size} cm` : `${size} cm`

// label size varian yang mendukung dimensi kedua (sizeB) untuk SQUARE non-cake:
// ROUND -> "20 cm", SQUARE -> "20×10 cm" (pakai sizeB kalau ada, jika tidak NxN)
export const variantSizeLabel = (shape, size, sizeB = null) => {
  if (size == null) return ''
  if (shape === 'SQUARE') return `${size}×${sizeB ?? size} cm`
  return `${size} cm`
}
