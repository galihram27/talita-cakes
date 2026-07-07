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
