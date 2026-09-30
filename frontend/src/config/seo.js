// src/config/seo.js

import { applyDiscount } from '@/utils/price'

/**
 * Perkakas SEO: judul & deskripsi halaman, serta data terstruktur yang dibaca
 * mesin pencari.
 *
 * Halaman situs ini di-render jadi HTML saat build, sehingga isinya bisa
 * dibaca mesin pencari tanpa menjalankan JavaScript — itu sebabnya berkas ini
 * penting.
 */

export const SITE_NAME = "Talita's Cake & Cupcakes"

/**
 * Alamat utama situs, diisi saat build lewat VITE_SITE_URL.
 *
 * Kalau belum diisi, seluruh tautan absolut sengaja dikosongkan. Menebak
 * alamat lebih berbahaya daripada tidak mencantumkannya: alamat yang salah
 * bisa membuat mesin pencari menganggap halaman ini salinan situs lain.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '')

// Ubah '/menu' jadi 'https://domain/menu'. Mengembalikan null kalau alamat
// situs belum diisi, supaya pemanggilnya bisa melewati tautan itu.
export const absUrl = (path = '/') => {
  if (!SITE_URL) return null
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// Deskripsi cadangan, dipakai halaman yang tidak punya deskripsi sendiri
export const DEFAULT_DESCRIPTION =
  "Talita's Cake & Cupcakes — kue premium di Depok. Custom cake, cupcakes, brownies, dan roti untuk ulang tahun, hampers, dan momen spesial. Pre-order fresh, konfirmasi via WhatsApp."

// Potong teks panjang jadi deskripsi ringkas. Batas 160 karakter dipilih
// karena sekitar itulah panjang yang ditampilkan hasil pencarian Google.
// Baris ganda & spasi berlebih dirapikan jadi satu spasi.
export const truncate = (text, max = 160) => {
  if (!text) return ''
  const clean = String(text).replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

// Harga termurah setelah diskon, dipakai sebagai harga yang dicantumkan ke
// mesin pencari. Varian tanpa harga diabaikan.
export const lowestPrice = (product) => {
  const prices = (product?.variants || [])
    .map((v) => Number(v.price))
    .filter((n) => n > 0)
  if (!prices.length) return null
  return applyDiscount(Math.min(...prices), product.discount || 0)
}

/**
 * Bungkus data jadi blok skrip khusus yang dibaca mesin pencari untuk
 * memahami isi halaman — misalnya "ini produk, harganya sekian".
 *
 * `key` dibuat tetap supaya blok yang sama tidak bertumpuk setiap kali
 * pengunjung berpindah halaman.
 */
export const jsonLd = (data) => ({
  type: 'application/ld+json',
  key: data['@type'] ? `ld-${data['@type']}` : 'ld',
  innerHTML: JSON.stringify(data),
})

// Keterangan usaha untuk halaman depan: memberi tahu mesin pencari bahwa ini
// toko kue, sehingga bisa muncul di hasil pencarian lokal
export const bakeryJsonLd = () => {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: SITE_NAME,
    servesCuisine: 'Bakery, Cake, Dessert',
    priceRange: 'Rp',
  }
  if (SITE_URL) data.url = SITE_URL
  return jsonLd(data)
}

// Keterangan produk untuk halaman detail. Bagian harga hanya disertakan
// kalau harganya memang diketahui — mencantumkan harga kosong lebih buruk
// daripada tidak mencantumkannya sama sekali.
export const productJsonLd = (product, url) => {
  const price = lowestPrice(product)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncate(product.description, 300),
    image: product.images?.length ? product.images : product.image ? [product.image] : [],
    brand: { '@type': 'Brand', name: SITE_NAME },
  }
  if (url) data.url = url
  if (price != null) {
    data.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
      ...(url ? { url } : {}),
    }
  }
  return jsonLd(data)
}
