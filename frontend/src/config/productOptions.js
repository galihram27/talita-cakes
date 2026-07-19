// src/config/productOptions.js
// Mirror aturan size dari backend (product.helper.js) supaya form admin
// hanya memunculkan pilihan yang pasti lolos validasi server.

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'TYPE1', label: 'Type 1 (Signature Collection)' },
  { value: 'TYPE2', label: 'Type 2 (Flavor & Design Choice)' },
  { value: 'TYPE3', label: 'Type 3 (Choose Your Size)' },
  { value: 'TYPE4', label: 'Type 4 (Fully Custom Cake)' },
  { value: 'TYPE5', label: 'Type 5 (Non-Cake)' },
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
