<script setup>
const props = defineProps({
  product: { type: Object, required: true },
})

// Label tipe, sama dengan section di halaman Menu
const TYPE_LABELS = {
  TYPE1: 'Signature Collection',
  TYPE2: 'Flavor & Design Choice',
  TYPE3: 'Choose Your Size',
  TYPE4: 'Fully Custom Cake',
}

// type dengan 1 variant fixed (tidak ada pilihan shape & size)
const isSingleVariantType = (type) => type === 'TYPE1' || type === 'TYPE2'

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
    return `${v.shape === 'ROUND' ? 'Round' : 'Square'} ${v.size} cm`
  }
  return null
}
</script>

<template>
  <RouterLink
    :to="{ name: 'product-detail', params: { id: product.id } }"
    class="group flex flex-col bg-white border border-cream-300 rounded-2xl overflow-hidden text-cocoa-900 transition-all duration-150 hover:shadow-[0_16px_32px_-16px_rgba(88,46,35,0.3)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
  >
    <!-- IMAGE (rasio 3:4) -->
    <div
      class="relative aspect-[3/4] overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)]"
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
    </div>

    <!-- INFO -->
    <div class="flex flex-col gap-1.5 px-4 pt-4 pb-4">
      <span
        class="text-[11.5px] font-extrabold tracking-[0.1em] uppercase text-cocoa-400"
      >
        {{ TYPE_LABELS[product.type] || product.type }}
      </span>
      <h3 class="font-display text-lg leading-snug group-hover:text-brand-500 transition-colors">
        {{ product.name }}
      </h3>

      <div class="flex items-baseline gap-2 flex-wrap">
        <template v-if="getDisplayPrice() !== null">
          <span
            v-if="!isSingleVariantType(product.type)"
            class="text-[10px] text-cocoa-400"
          >
            mulai dari
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
        <span v-else class="font-bold text-base text-brand-500">Price</span>

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
