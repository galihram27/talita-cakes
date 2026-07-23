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
      "Goodiebag Cupcakes",
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

// Sub-kategori TYPE5 yang size-nya DIPILIH USER (harga per size), bukan size
// tunggal input admin. Tiap size punya harga sendiri; user memilih size saat
// order (mirip TYPE3). Bentuk tetap (mis. ROUND).
// (mirror ke frontend/src/config/productOptions.js -> TYPE5_SIZE_SUBCATEGORIES)
export const TYPE5_SIZE_SUBCATEGORIES = {
   "BASQUE BURNT CHEESE CAKE": { shape: "ROUND", sizes: [14, 16, 18, 20] },
};

// Config size-pilihan untuk satu sub-kategori TYPE5 (null kalau bukan).
export const type5SizeConfig = (subcategory) =>
   TYPE5_SIZE_SUBCATEGORIES[subcategory] ?? null;

// ===== BREAD (kategori) — ukuran-pilihan user dengan dimensi TETAP =====
// Semua produk Bread (Cinrolls & Mozzarella) memakai 3 ukuran ini. User memilih
// salah satunya; admin menetapkan HARGA tiap ukuran (ukuran tanpa harga = tidak
// dijual). Dimensi sudah ditentukan (bukan input admin).
// (mirror ke frontend/src/config/productOptions.js)
export const BREAD_CATEGORY = "Bread";
export const isBreadCategory = (category) => category === BREAD_CATEGORY;

export const BREAD_SIZES = [
   { key: "PERSONAL", label: "Personal Size", shape: "SQUARE", size: 22, sizeB: 10 },
   { key: "FAMILY", label: "Family Size", shape: "ROUND", size: 25, sizeB: null },
   { key: "SHARING", label: "Sharing Size", shape: null, size: 9, sizeB: null },
];

export const BREAD_SIZE_KEYS = BREAD_SIZES.map((s) => s.key);

export const breadSizeByKey = (key) =>
   BREAD_SIZES.find((s) => s.key === key) ?? null;

// Cari ukuran bread yang cocok dengan sebuah variant (berdasar shape/size/sizeB).
export const breadSizeForVariant = (variant) =>
   BREAD_SIZES.find(
      (s) =>
         s.shape === (variant.shape ?? null) &&
         s.size === (variant.size ?? null) &&
         (s.sizeB ?? null) === (variant.sizeB ?? null)
   ) ?? null;

// ===== FILLING & TOPPING (khusus sub-kategori CINROLLS VAN DEPOK) =====
// Admin menentukan sendiri daftar pilihan untuk keduanya.
// - FILLING: pilih SATU (radio). Tiap opsi punya harga (opsional, default 0).
// - TOPPING: wajib pilih min 1, boleh beberapa (maks 3). TANPA harga.
// (mirror ke frontend/src/config/productOptions.js)
export const CINROLLS_VAN_DEPOK = "CINROLLS VAN DEPOK";
export const MAX_FILLING_OPTIONS = 6; // maksimal opsi filling yang bisa dibuat admin
export const MAX_TOPPING_OPTIONS = 6; // maksimal opsi topping yang bisa dibuat admin
export const MAX_TOPPING_SELECT = 3; // maksimal jumlah topping yang boleh dipilih user

// Apakah sub-kategori TYPE5 ini memakai pilihan filling & topping?
export const usesFilling = (subcategory) => subcategory === CINROLLS_VAN_DEPOK;
export const usesTopping = (subcategory) => subcategory === CINROLLS_VAN_DEPOK;

// Apakah sub-kategori TYPE5 ini memakai pilihan size oleh user?
export const isType5SizeSubcategory = (subcategory) =>
   Object.prototype.hasOwnProperty.call(TYPE5_SIZE_SUBCATEGORIES, subcategory);

// Apakah kategori TYPE5 ini punya sub-kategori? Kategori tanpa entri di
// TYPE5_SUBCATEGORIES (mis. "Mozzarella Sausage Rolls") tidak memakai subcategory.
export const type5HasSubcategories = (category) =>
   (TYPE5_SUBCATEGORIES[category]?.length ?? 0) > 0;

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
// Rasa cupcake memakai nama tersendiri (berakhiran "Cupcakes") supaya tidak
// tertukar dengan rasa cake yang namanya mirip. Seluruh kategori cupcake
// berbagi daftar yang sama; yang berbeda antar kategori hanya pilihan isi box
// dan apakah rasanya ditentukan admin (American Butter).
const CUPCAKE_FLAVORS = [
   "Double Choco Cupcakes",
   "Choco Blueberry Cupcakes",
   "Vanilla Cheese Cupcakes",
   "Vanilla Strawberry Cupcakes",
];

// Rasa Goodiebag sub-kategori "Original Goodiebag" (user memilih 1-4 rasa).
const ORIGINAL_GOODIEBAG_FLAVORS = [
   "Strawberry Marshmallow",
   "Double Cheese",
   "Vanilla Oreo",
   "Happy Blueberry",
   "Vanilla Biscoff",
   "Vanilla Greentea",
   "Double Choco",
   "Choco Oreo",
   "Nutella",
   "Choco Blueberry",
];

// Goodiebag Cupcakes punya dua sub-kategori; tiap sub-kategori punya daftar rasa
// sendiri DAN batas jumlah rasa yang boleh dipilih pembeli:
// - Original: pilih 1-4 rasa (jamak).
// - Custom: pilih tepat 1 rasa.
// Admin membuat produk goodiebag per sub-kategori (dengan harga per box sendiri).
// (mirror ke frontend/src/config/productOptions.js -> GOODIEBAG_SUBCATEGORIES)
export const GOODIEBAG_SUBCATEGORIES = {
   "Original Goodiebag": {
      flavors: ORIGINAL_GOODIEBAG_FLAVORS,
      minFlavors: 1,
      maxFlavors: 4,
   },
   "Custom Goodiebag": {
      flavors: CUPCAKE_FLAVORS,
      minFlavors: 1,
      maxFlavors: 1,
   },
};

/**
 * Aturan per kategori TYPE6.
 * - fixedFlavor: true  -> rasa & dekorasi ditentukan admin (user tidak memilih)
 * - fixedFlavor: false -> user memilih rasa + mengunggah referensi dekorasi
 *                         (pola yang sama dengan TYPE2)
 * - boxes: pilihan isi box yang tersedia (disimpan di ProductVariant.size)
 * - goodiebag: true -> tidak ada pilihan isi box. Harga tunggal per box, user
 *                      membeli sejumlah box (minimal `minQty`). Total = harga x qty.
 * - multiFlavor: true -> user memilih beberapa rasa sekaligus (minFlavors..maxFlavors),
 *                        bukan satu rasa. Rasa yang dipilih disimpan tergabung.
 * (mirror ke frontend/src/config/productOptions.js -> TYPE6_CATEGORY_CONFIG)
 */
export const TYPE6_CATEGORY_CONFIG = {
   "American Butter Cupcakes": {
      fixedFlavor: true,
      flavors: [],
      boxes: [2, 4, 6, 9, 12],
   },
   "Simple Decor Cupcakes": {
      fixedFlavor: false,
      flavors: CUPCAKE_FLAVORS,
      boxes: [4, 6, 9, 12],
   },
   "Paper Topper Cupcakes": {
      fixedFlavor: false,
      flavors: CUPCAKE_FLAVORS,
      boxes: [6, 9, 12],
   },
   "Custom 3D Cupcakes": {
      fixedFlavor: false,
      flavors: CUPCAKE_FLAVORS,
      boxes: [4, 6, 9, 12],
   },
   // Goodiebag: harga tunggal per box, tanpa pilihan isi box. Punya sub-kategori
   // (lihat GOODIEBAG_SUBCATEGORIES); pilihan rasa mengikuti sub-kategori produk.
   // User memilih 1-4 rasa, minimal beli 10 box.
   "Goodiebag Cupcakes": {
      fixedFlavor: false,
      flavors: [], // rasa ditentukan per sub-kategori, bukan per kategori
      boxes: [],
      goodiebag: true,
      minQty: 10,
      multiFlavor: true,
      minFlavors: 1,
      maxFlavors: 4,
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

// Apakah kategori TYPE6 ini model goodiebag (harga tunggal per box, min qty)?
export const isGoodiebagCupcake = (category) =>
   TYPE6_CATEGORY_CONFIG[category]?.goodiebag === true;

// Jumlah box minimum untuk kategori goodiebag (default 1 untuk kategori lain).
export const goodiebagMinQty = (category) =>
   TYPE6_CATEGORY_CONFIG[category]?.minQty ?? 1;

// Daftar sub-kategori goodiebag (level-2).
export const goodiebagSubcategories = () => Object.keys(GOODIEBAG_SUBCATEGORIES);

// Rasa yang tersedia untuk satu sub-kategori goodiebag.
export const goodiebagFlavorsForSubcategory = (subcategory) =>
   GOODIEBAG_SUBCATEGORIES[subcategory]?.flavors ?? [];

// Batas jumlah rasa yang boleh dipilih untuk satu sub-kategori goodiebag.
export const goodiebagFlavorLimit = (subcategory) => ({
   min: GOODIEBAG_SUBCATEGORIES[subcategory]?.minFlavors ?? 1,
   max: GOODIEBAG_SUBCATEGORIES[subcategory]?.maxFlavors ?? 1,
});

// Apakah string ini sub-kategori goodiebag yang sah?
export const isGoodiebagSubcategory = (subcategory) =>
   Object.prototype.hasOwnProperty.call(GOODIEBAG_SUBCATEGORIES, subcategory);

// Apakah kategori TYPE6 ini memakai pilihan rasa jamak (mis. goodiebag)?
export const isMultiFlavorCupcake = (category) =>
   TYPE6_CATEGORY_CONFIG[category]?.multiFlavor === true;

// Batas jumlah rasa yang boleh dipilih untuk kategori rasa-jamak.
export const cupcakeFlavorLimit = (category) => ({
   min: TYPE6_CATEGORY_CONFIG[category]?.minFlavors ?? 1,
   max: TYPE6_CATEGORY_CONFIG[category]?.maxFlavors ?? 1,
});

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
      ...CUPCAKE_FLAVORS,
      ...ORIGINAL_GOODIEBAG_FLAVORS,
   ]),
];
