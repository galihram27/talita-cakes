// src/config/seo.js
// Utilitas SEO untuk meta tag & data terstruktur (dipakai bersama vite-ssg).

export const SITE_NAME = "Talita's Cake & Cupcakes"

// Base URL situs untuk canonical & Open Graph (harus absolut). Set lewat
// VITE_SITE_URL saat build/deploy, mis. https://talitascake.com.
// Kalau kosong, canonical & og:url di-skip supaya tidak menunjuk domain salah.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '')

// URL absolut dari sebuah path ('/menu' -> 'https://domain/menu'); kembalikan
// null kalau SITE_URL belum di-set (biar caller bisa melewati canonical/og:url).
export const absUrl = (path = '/') => {
  if (!SITE_URL) return null
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// Deskripsi default situs (dipakai halaman yang tak punya deskripsi khusus).
export const DEFAULT_DESCRIPTION =
  "Talita's Cake & Cupcakes — kue premium di Depok. Custom cake, cupcakes, brownies, dan roti untuk ulang tahun, hampers, dan momen spesial. Pre-order fresh, konfirmasi via WhatsApp."

// Potong teks panjang jadi deskripsi meta yang rapi (default 160 karakter).
export const truncate = (text, max = 160) => {
  if (!text) return ''
  const clean = String(text).replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

// Harga termurah (setelah diskon) dari varian produk — untuk Offer JSON-LD.
export const lowestPrice = (product) => {
  const prices = (product?.variants || [])
    .map((v) => Number(v.price))
    .filter((n) => n > 0)
  if (!prices.length) return null
  const discount = Number(product.discount || 0)
  const min = Math.min(...prices)
  return Math.round((min - (min * discount) / 100) * 100) / 100
}

// Bangun blok <script type="application/ld+json"> untuk useHead.
export const jsonLd = (data) => ({
  type: 'application/ld+json',
  // key stabil supaya unhead tidak menduplikasi antar navigasi
  key: data['@type'] ? `ld-${data['@type']}` : 'ld',
  innerHTML: JSON.stringify(data),
})

// Data terstruktur usaha (dipakai di Home) — schema.org Bakery.
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

// Data terstruktur produk (dipakai di halaman detail) — schema.org Product.
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
