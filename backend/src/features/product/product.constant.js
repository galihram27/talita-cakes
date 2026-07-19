// src/features/product/product.constant.js

// daftar kategori yang valid per product type
// (mirror ke frontend/src/config/productOptions.js -> PRODUCT_CATEGORIES)
export const PRODUCT_CATEGORIES = {
   TYPE1: ["Signature Petite Cake Series", "Signature Shortcake Series"],
   TYPE2: [
      "Simple Decor Petite Cake",
      "Paper Topper Petite Cake",
      "Custom 2D Petite Cake",
   ],
   TYPE3: [
      "Signature Original Cake Series",
      "Signature Royal Cake",
      "Signature Tropical Fruit Cake",
   ],
   TYPE4: [
      "Custom Paper Topper Cake",
      "Custom Edible Photo Cake",
      "Custom Exclusive Figurine Cake",
      "Custom Figurine Fondant Cake",
      "Custom 3D Cake Fondant",
      "Signature Simple Custom Decor",
      "Signature Premium Custom Decor",
      "Signature Royal Custom Decor",
      "Signature Simple Roses Cake",
   ],
   // TYPE5 (non-cake): kategori level-1. Sub-kategori level-2 ada di
   // TYPE5_SUBCATEGORIES di bawah.
   TYPE5: ["Bread", "Cheese Cake", "Brownies"],
   // TYPE6 (cupcakes): tiap kategori punya aturan rasa & isi box sendiri,
   // lihat TYPE6_CATEGORY_CONFIG di bawah.
   TYPE6: [
      "American Butter Cupcakes",
      "Simple Decor Cupcakes",
      "Paper Topper Cupcakes",
      "Custom 3D Cupcakes",
   ],
};

// Sub-kategori (level-2) untuk TYPE5, dikelompokkan per kategori level-1.
// (mirror ke frontend/src/config/productOptions.js -> TYPE5_SUBCATEGORIES)
export const TYPE5_SUBCATEGORIES = {
   Bread: ["CINROLLS VAN DEPOK", "MOZZARELLA SAUSAGE ROLLS"],
   "Cheese Cake": ["BASQUE BURNT CHEESE CAKE"],
   Brownies: [
      "SIGNATURE PREMIUM FUDGE BROWNIES",
      "SIGNATURE ASSORTED BROWNIES BOX",
      "SIGNATURE CUSTOM BROWNIES BOX",
   ],
};

// Gabungan semua sub-kategori TYPE5 — dipakai validasi saat update partial
// yang mungkin mengirim subcategory tanpa category.
export const ALL_TYPE5_SUBCATEGORIES = Object.values(TYPE5_SUBCATEGORIES).flat();

// Rasa yang bisa dipilih user untuk TYPE2 (petite cake custom decor).
// (mirror ke frontend/src/config/constants.js -> TYPE2_FLAVORS)
export const TYPE2_FLAVORS = [
   "Double Choco",
   "Choco Blueberry",
   "Vanilla Cheese",
   "Vanilla Strawberry",
];

// Rasa yang bisa dipilih user untuk TYPE4 (custom cake).
// (mirror ke frontend/src/config/constants.js -> CUSTOM_FLAVORS)
export const CUSTOM_FLAVORS = [
   "Blackforest",
   "Double Choco Cream",
   "Oreo Choco",
   "Snow White Double Cheese",
   "Vanilla Double Cheese",
   "Oreo Cheese",
];

// ===== TYPE6 (cupcakes) =====
// Rasa cupcake berbeda per KATEGORI, bukan per tipe: Paper Topper memakai
// "Vanilla Strawberry", sedangkan Simple Decor & Custom 3D memakai
// "Strawberry Marshmallow". Karena itu TYPE6 tidak masuk FLAVORS_BY_TYPE.
const CUPCAKE_FLAVORS_STANDARD = [
   "Double Choco",
   "Oreo Choco",
   "Choco Blueberry",
   "Vanilla Cheese",
   "Strawberry Marshmallow",
   "Vanilla Oreo",
];

const CUPCAKE_FLAVORS_PAPER_TOPPER = [
   "Double Choco",
   "Oreo Choco",
   "Choco Blueberry",
   "Vanilla Cheese",
   "Vanilla Strawberry",
   "Vanilla Oreo",
];

/**
 * Aturan per kategori TYPE6.
 * - fixedFlavor: true  -> rasa & dekorasi ditentukan admin (user tidak memilih)
 * - fixedFlavor: false -> user memilih rasa + mengunggah referensi dekorasi
 *                         (pola yang sama dengan TYPE2)
 * - boxes: pilihan isi box yang tersedia (disimpan di ProductVariant.size)
 * (mirror ke frontend/src/config/productOptions.js -> TYPE6_CATEGORY_CONFIG)
 */
export const TYPE6_CATEGORY_CONFIG = {
   "American Butter Cupcakes": {
      fixedFlavor: true,
      flavors: [],
      boxes: [4, 6, 9, 12],
   },
   "Simple Decor Cupcakes": {
      fixedFlavor: false,
      flavors: CUPCAKE_FLAVORS_STANDARD,
      boxes: [4, 6, 9, 12],
   },
   "Paper Topper Cupcakes": {
      fixedFlavor: false,
      flavors: CUPCAKE_FLAVORS_PAPER_TOPPER,
      boxes: [6, 9, 12],
   },
   "Custom 3D Cupcakes": {
      fixedFlavor: false,
      flavors: CUPCAKE_FLAVORS_STANDARD,
      boxes: [4, 6, 9, 12],
   },
};

// Rasa yang boleh dipilih user untuk satu kategori TYPE6.
export const cupcakeFlavorsForCategory = (category) =>
   TYPE6_CATEGORY_CONFIG[category]?.flavors ?? [];

// Isi box yang tersedia untuk satu kategori TYPE6.
export const cupcakeBoxesForCategory = (category) =>
   TYPE6_CATEGORY_CONFIG[category]?.boxes ?? [];

// Apakah kategori TYPE6 ini rasanya fixed (ditentukan admin)?
export const isFixedFlavorCupcake = (category) =>
   TYPE6_CATEGORY_CONFIG[category]?.fixedFlavor === true;

// Map rasa per tipe produk — dipakai validasi service layer sesuai Product.type.
// TYPE6 sengaja tidak di sini karena rasanya ditentukan per kategori.
export const FLAVORS_BY_TYPE = {
   TYPE2: TYPE2_FLAVORS,
   TYPE4: CUSTOM_FLAVORS,
};

// Gabungan semua rasa — dipakai validasi bentuk payload di schema (enum),
// validasi "rasa mana untuk tipe/kategori apa" tetap di service layer.
export const ALL_FLAVORS = [
   ...new Set([
      ...TYPE2_FLAVORS,
      ...CUSTOM_FLAVORS,
      ...CUPCAKE_FLAVORS_STANDARD,
      ...CUPCAKE_FLAVORS_PAPER_TOPPER,
   ]),
];
