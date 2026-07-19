<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  product: { type: Object, required: true },
})

const { t } = useI18n()

// Label tipe, sama dengan section di halaman Menu
const typeLabel = (type) => {
  const num = { TYPE1: 1, TYPE2: 2, TYPE3: 3, TYPE4: 4, TYPE5: 5, TYPE6: 6 }[type]
  return num ? t(`home.types.t${num}.tag`) : type
}

// type dengan 1 variant fixed (tidak ada pilihan shape & size)
const isSingleVariantType = (type) => type === 'TYPE1' || type === 'TYPE2'

// TYPE3/TYPE4 (banyak ukuran) & TYPE6 (banyak isi box) harganya rentang
// -> tampilkan "mulai dari". TYPE5 harga tunggal.
const showsPriceRange = (type) =>
  type === 'TYPE3' || type === 'TYPE4' || type === 'TYPE6'

// Label di atas nama produk memakai kategori, bukan nama tipe:
// TYPE5 (non-cake) pakai sub-kategori (mis. "CINROLLS VAN DEPOK"),
// TYPE1–TYPE4 pakai kategori (mis. "Custom Paper Topper Cake").
// Label tipe tetap jadi fallback untuk data lama yang kategorinya masih kosong.
const cardLabel = computed(() => {
  const { type, category, subcategory } = props.product
  if (type === 'TYPE5') return subcategory || category || typeLabel(type)
  return category || typeLabel(type)
})

// nama kategori (level-1) yang ditempel di pojok kanan atas foto, khusus TYPE5
const cornerCategory = computed(() =>
  props.product.type === 'TYPE5' ? props.product.category : null
)

const formatRupiah = (amount) => `Rp${Number(amount).toLocaleString('id-ID')}`

// Untuk TYPE1/TYPE2: ambil 1 variant. Untuk TYPE3/TYPE4: cari harga termurah.
const getDisplayPrice = () => {
  if (!props.product.variants || props.product.variants.length === 0) return null
  const prices = props.product.variants.map((v) => Number(v.price))
  return Math.min(...prices)
}

// Harga setelah diskon (discount dalam persen), rumus sama dengan halaman detail
const getDiscountedPrice = () => {
  const price = getDisplayPrice()
  if (price === null) return null
  const discount = Number(props.product.discount ?? 0)
  if (discount <= 0) return price
  return Math.round((price - (price * discount) / 100) * 100) / 100
}

const getDisplaySize = () => {
  if (isSingleVariantType(props.product.type) && props.product.variants?.[0]) {
    const v = props.product.variants[0]
    return `${v.shape === 'ROUND' ? t('product.round') : t('product.square')} ${v.size} cm`
  }
  return null
}
</script>

<template>
  <RouterLink
    :to="{ name: 'product-detail', params: { id: product.id } }"
    class="group flex flex-col bg-white border border-cream-300 rounded-2xl overflow-hidden text-cocoa-900 transition-all duration-150 hover:shadow-[0_16px_32px_-16px_rgba(88,46,35,0.3)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
  >
    <!-- IMAGE (rasio 1:1) -->
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

      <!-- Kategori level-1 (TYPE5): pojok kanan atas foto -->
      <span
        v-if="cornerCategory"
        class="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-sm border border-cream-300 px-2.5 py-1 text-[11px] font-extrabold text-cocoa-900 shadow-[0_2px_8px_-2px_rgba(51,38,31,0.25)]"
      >
        {{ cornerCategory }}
      </span>
    </div>

    <!-- INFO (flex-1 supaya blok ini mengisi sisa tinggi kartu) -->
    <div class="flex flex-col flex-1 gap-1.5 px-4 pt-4 pb-4">
      <span
        class="text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-cocoa-400"
      >
        {{ cardLabel }}
      </span>
      <h3 class="font-display text-lg leading-snug">
        {{ product.name }}
      </h3>

      <!-- mt-auto: harga selalu menempel di dasar kartu, berapa pun
           panjang label kategori & nama produk di atasnya -->
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
