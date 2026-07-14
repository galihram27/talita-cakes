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
};

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

// Map rasa per tipe produk — dipakai validasi service layer sesuai Product.type.
export const FLAVORS_BY_TYPE = {
   TYPE2: TYPE2_FLAVORS,
   TYPE4: CUSTOM_FLAVORS,
};

// Gabungan semua rasa — dipakai validasi bentuk payload di schema (enum),
// validasi "rasa mana untuk tipe apa" tetap di service layer.
export const ALL_FLAVORS = [...TYPE2_FLAVORS, ...CUSTOM_FLAVORS];
