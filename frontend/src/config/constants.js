// src/config/constants.js

// Info toko untuk halaman About Us dll.
// Isi yang tersedia saja — field kosong otomatis disembunyikan di halaman.
export const STORE_INFO = {
  since: 2012,
  whatsappNumber: import.meta.env.VITE_OWNER_WHATSAPP_NUMBER || '', // format internasional tanpa "+", contoh: 6281234567890
  instagram: import.meta.env.VITE_OWNER_INSTAGRAM || '', // username tanpa "@", contoh: talitascake
  threads: import.meta.env.VITE_OWNER_THREADS || '', // username tanpa "@", contoh: talitacakes
  tiktok: import.meta.env.VITE_OWNER_TIKTOK || '', // username tanpa "@", contoh: talitacakesdepok
  address: import.meta.env.VITE_STORE_ADDRESS || '', // alamat toko / area pengantaran
  // Sertifikat Halal BPJPH — bisa dioverride lewat env.
  halalCertNumber: import.meta.env.VITE_HALAL_CERT_NUMBER || '3211000038200522',
}

// Tarif ongkir berjenjang berdasarkan radius dari toko
// (mirror dari backend order.helper.js -> calculateDeliveryFee)
export const MAX_DELIVERY_DISTANCE_KM = 25
export const DELIVERY_FEE_TIERS = [
  { label: 'Radius < 5 km', fee: 30000 },
  { label: 'Radius 5–10 km', fee: 45000 },
  { label: 'Radius 11–15 km', fee: 55000 },
  { label: 'Radius 16–20 km', fee: 65000 },
  { label: 'Radius 21–25 km', fee: 75000 },
]

// daftar rasa yang bisa dipilih user untuk TYPE2 (petite cake custom decor)
// (mirror dari backend product.constant.js -> TYPE2_FLAVORS)
export const TYPE2_FLAVORS = [
  'Double Choco',
  'Choco Blueberry',
  'Vanilla Cheese',
  'Vanilla Strawberry',
]

// daftar rasa yang bisa dipilih user untuk TYPE4 (custom cake)
// (mirror dari backend product.constant.js -> CUSTOM_FLAVORS)
export const CUSTOM_FLAVORS = [
  'Blackforest',
  'Double Choco Cream',
  'Oreo Choco',
  'Snow White Double Cheese',
  'Vanilla Double Cheese',
  'Oreo Cheese',
]

// Penjelasan rasa untuk popup di halaman detail produk (TYPE2 & TYPE4)
export const FLAVOR_DESCRIPTIONS = {
  Blackforest: {
    id: 'Cake coklat lembut dengan lapisan Blueberry Jam dan Blueberry Cream yang manis, segar, dan seimbang.',
    en: 'Soft chocolate cake layered with Blueberry Jam and Blueberry Cream for a perfectly balanced sweet and fruity flavor.',
  },
  'Double Choco Cream': {
    id: 'Cake coklat lembut dengan lapisan Homemade Chocolate Ganache dan Choco Cream yang kaya rasa dan creamy.',
    en: 'Soft chocolate cake layered with Homemade Chocolate Ganache and Choco Cream for a rich, creamy chocolate experience.',
  },
  'Oreo Choco': {
    id: 'Cake coklat lembut dengan lapisan Homemade Chocolate Ganache dan Oreo Crumble yang renyah di setiap gigitan.',
    en: 'Soft chocolate cake layered with Homemade Chocolate Ganache and crunchy Oreo Crumble for extra texture and flavor.',
  },
  'Snow White Double Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cream Cheese dan Strawberry Jam yang memadukan rasa gurih dan segar.',
    en: 'Soft vanilla cake layered with Cheddar Cream Cheese and Strawberry Jam for a delightful sweet and savory combination.',
  },
  'Vanilla Double Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cream Cheese di setiap layer, menghadirkan rasa creamy dan gurih yang lembut.',
    en: 'Soft vanilla cake layered with Cheddar Cream Cheese in every layer for a smooth, creamy, and cheesy flavor.',
  },
  'Oreo Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cream Cheese dan Oreo Crumble yang creamy dengan sentuhan renyah.',
    en: 'Soft vanilla cake layered with Cheddar Cream Cheese and crunchy Oreo Crumble for a creamy flavor with a satisfying crunch.',
  },
}