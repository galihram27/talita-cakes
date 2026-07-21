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
}

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

// Rasa American Butter Cupcakes — dipakai sebagai pilihan rasa Goodiebag
// (user memilih beberapa rasa). Mirror dari backend product.constant.js.
export const AMERICAN_BUTTER_FLAVORS = [
  'Chocolate',
  'Cheese',
  'Choco Blueberry',
  'Vanilla Blueberry',
  'Oreo Chocolate',
  'Vanilla Oreo',
  'Choco Nutella',
  'Strawberry',
  'Lotus Biscoff',
  'Greentea',
]

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
  // Goodiebag: harga tunggal per box (tanpa pilihan isi box). User memilih 1-4
  // rasa dari daftar rasa American Butter. Minimal beli 10 box.
  'Goodiebag Cupcakes': {
    fixedFlavor: false,
    flavors: AMERICAN_BUTTER_FLAVORS,
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
