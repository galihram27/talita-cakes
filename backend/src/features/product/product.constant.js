// src/features/product/product.constant.js

// daftar kategori yang valid per product type
// (mirror ke frontend/src/config/productOptions.js -> PRODUCT_CATEGORIES)
export const PRODUCT_CATEGORIES = {
   TYPE1: ["Signature Shortcake Series"],
   TYPE2: ["Simple Decor Petite Cake", "Paper Topper Petite Cake", "Custom 2D Petite Cake"],
   TYPE3: ["Signature Original Cake"],
   TYPE4: ["Signature Custom Cake"],
};

// daftar rasa yang bisa dipilih user untuk TYPE2 & TYPE4
// (produk tipe ini tidak punya flavor fixed, user pilih sendiri saat order)
export const CUSTOM_FLAVORS = [
   "Blackforest",
   "Double Choco Cream",
   "Oreo Choco",
   "Snow White Double Cheese",
   "Vanilla Double Cheese",
   "Oreo Cheese",
];
