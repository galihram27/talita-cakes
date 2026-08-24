<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isType5SizeSubcategory } from '@/config/productOptions'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

/**
 * Kartu produk di halaman Menu dan Home.
 *
 * Tugas utamanya menyusun tiga hal yang aturannya berbeda-beda per tipe
 * produk: label kategori, harga, dan keterangan ukuran.
 */

// Label tipe, memakai kamus yang sama dengan halaman Menu
const typeLabel = (type) => {
  const num = { TYPE1: 1, TYPE2: 2, TYPE3: 3, TYPE4: 4, TYPE5: 5, TYPE6: 6 }[type]
  return num ? t(`home.types.t${num}.tag`) : type
}

// Produk yang ukurannya tunggal, jadi tidak ada yang perlu dipilih pembeli
const isSingleVariantType = (type) => type === 'TYPE1' || type === 'TYPE2'

// Produk berukuran banyak harganya beragam, jadi yang ditampilkan harga
// termurah dengan awalan "mulai dari" — bukan satu harga pasti
const showsPriceRange = (type) =>
  type === 'TYPE3' ||
  type === 'TYPE4' ||
  type === 'TYPE6' ||
  (type === 'TYPE5' && isType5SizeSubcategory(props.product.subcategory))

/**
 * Label di atas nama produk, dipilih berjenjang: TYPE5 memakai sub-kategori
 * (mis. "CINROLLS VAN DEPOK"), tipe lain memakai kategori (mis. "Custom Paper
 * Topper Cake"), dan nama tipe jadi jalan terakhir untuk produk lama yang
 * kategorinya belum terisi.
 */
const cardLabel = computed(() => {
  const { type, category, subcategory } = props.product
  if (type === 'TYPE5') return subcategory || category || typeLabel(type)
  return category || typeLabel(type)
})

// TYPE5 punya dua tingkat penamaan, jadi kategorinya ditempel di pojok foto
// supaya tidak bertabrakan dengan sub-kategori yang sudah jadi label utama
const cornerCategory = computed(() =>
  props.product.type === 'TYPE5' ? props.product.category : null
)

const formatRupiah = (amount) => `Rp${Number(amount).toLocaleString('id-ID')}`

// Harga termurah di antara semua varian. Untuk produk berukuran tunggal
// hasilnya ya harga satu-satunya itu.
const getDisplayPrice = () => {
  if (!props.product.variants || props.product.variants.length === 0) return null
  const prices = props.product.variants.map((v) => Number(v.price))
  return Math.min(...prices)
}

// Diskon dalam persen. Rumusnya harus sama dengan halaman detail, kalau tidak
// harga di kartu dan di halaman produk bisa berbeda.
const getDiscountedPrice = () => {
  const price = getDisplayPrice()
  if (price === null) return null
  const discount = Number(props.product.discount ?? 0)
  if (discount <= 0) return price
  return Math.round((price - (price * discount) / 100) * 100) / 100
}

/**
 * Keterangan ukuran di pojok kanan bawah kartu, mis. "Round 20 cm".
 *
 * Hanya muncul untuk produk yang ukurannya cuma satu — produk berukuran
 * banyak tidak bisa diwakili satu angka, jadi dikosongkan saja.
 */
const getDisplaySize = () => {
  if (
    props.product.type === 'TYPE5' &&
    isType5SizeSubcategory(props.product.subcategory)
  )
    return null

  const singleVariant =
    isSingleVariantType(props.product.type) || props.product.type === 'TYPE5'
  const v = props.product.variants?.[0]
  if (!singleVariant || !v || v.size == null) return null

  const shapeWord = v.shape === 'ROUND' ? t('product.round') : t('product.square')
  // Roti kotak punya dua dimensi (mis. 22×10 cm); selainnya cukup satu angka
  const dims = v.shape === 'SQUARE' && v.sizeB != null ? `${v.size}×${v.sizeB}` : `${v.size}`
  return `${shapeWord} ${dims} cm`
}
</script>

<template>
  <RouterLink
    data-product-card
    :to="{ name: 'product-detail', params: { id: product.id } }"
    class="group flex flex-col bg-white border border-cream-300 rounded-2xl overflow-hidden text-cocoa-900 transition-all duration-150 hover:shadow-[0_16px_32px_-16px_rgba(88,46,35,0.3)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
  >
    <!-- Foto produk, selalu bujur sangkar supaya seluruh kartu sejajar
         rapi dalam grid. Latar bergaris tampil kalau fotonya belum ada. -->
    <div
      class="relative aspect-square overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)]"
    >
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span
        v-else
        class="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-[#A08874] text-center p-3"
      >
        {{ product.name }}
      </span>

      <span
        v-if="Number(product.discount) > 0"
        class="absolute top-3 left-3 rounded-full bg-brand-500 text-white px-2.5 py-1 text-xs font-extrabold"
      >
        -{{ Number(product.discount) }}%
      </span>

      <!-- Kategori TYPE5 di pojok kanan atas foto -->
      <span
        v-if="cornerCategory"
        class="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-sm border border-cream-300 px-2.5 py-1 text-[11px] font-extrabold text-cocoa-900 shadow-[0_2px_8px_-2px_rgba(51,38,31,0.25)]"
      >
        {{ cornerCategory }}
      </span>
    </div>

    <!-- flex-1 membuat blok ini mengisi sisa tinggi kartu, jadi semua kartu
         dalam satu baris tetap sama tinggi walau nama produknya beda panjang -->
    <div class="flex flex-col flex-1 gap-1.5 px-4 pt-4 pb-4">
      <span
        class="text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-cocoa-400"
      >
        {{ cardLabel }}
      </span>
      <h3 class="font-display text-lg leading-snug">
        {{ product.name }}
      </h3>

      <!-- mt-auto mendorong baris harga ke dasar kartu, jadi letaknya sejajar
           di semua kartu berapa pun panjang nama produk di atasnya -->
      <div class="flex items-baseline gap-2 flex-wrap mt-auto pt-1.5">
        <template v-if="getDisplayPrice() !== null">
          <span
            v-if="showsPriceRange(product.type)"
            class="text-[10px] text-cocoa-400"
          >
            {{ t('product.startingFrom') }}
          </span>
          <template v-if="Number(product.discount) > 0">
            <span class="font-bold text-base text-brand-500 tracking-tight">
              {{ formatRupiah(getDiscountedPrice()) }}
            </span>
            <span class="text-[13px] text-[#B7A18E] line-through">
              {{ formatRupiah(getDisplayPrice()) }}
            </span>
          </template>
          <span v-else class="font-bold text-base text-brand-500 tracking-tight">
            {{ formatRupiah(getDisplayPrice()) }}
          </span>
        </template>
        <span v-else class="font-bold text-base text-brand-500">{{ t('product.price') }}</span>

        <span
          v-if="getDisplaySize()"
          class="ml-auto rounded-full border border-cream-500 px-2.5 py-0.5 text-xs whitespace-nowrap text-[#6E5A4D]"
        >
          {{ getDisplaySize() }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>
