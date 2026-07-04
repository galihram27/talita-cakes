<script setup>
const props = defineProps({
  product: { type: Object, required: true },
})

// Label tipe, sama dengan section di halaman Menu
const TYPE_LABELS = {
  TYPE1: 'Fixed',
  TYPE2: 'Custom Flavor',
  TYPE3: 'Semi-Custom',
  TYPE4: 'Fully Custom',
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
    return `${v.shape === 'ROUND' ? 'Round' : 'Square'} ${v.size}cm`
  }
  return null
}
</script>

<template>
  <RouterLink
    :to="{ name: 'product-detail', params: { id: product.id } }"
    class="group block rounded-xl overflow-hidden bg-white border border-gray-200 transition duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
  >
    <!-- IMAGE (rasio 3:4) -->
    <div class="relative aspect-[3/4] bg-gray-200 flex items-center justify-center overflow-hidden">
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span v-else class="text-gray-400 text-xs">No Image</span>

      <span
        class="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 px-3 py-1 text-xs font-medium shadow-sm"
      >
        {{ TYPE_LABELS[product.type] || product.type }}
      </span>
      <span
        v-if="Number(product.discount) > 0"
        class="absolute top-2 right-2 rounded-full bg-brand-600 text-white px-3 py-1 text-xs font-semibold shadow-sm"
      >
        Discount
      </span>

      <!-- Ajakan muncul saat hover -->
      <div
        class="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-brand-600/90 text-white text-center text-xs font-semibold py-2"
      >
        Lihat Detail
      </div>
    </div>

    <!-- INFO -->
    <div class="p-3 border-t border-gray-100">
      <h3 class="font-bold text-sm truncate group-hover:text-brand-600 transition-colors">
        {{ product.name }}
      </h3>
      <div class="h-px bg-gray-100 my-2"></div>

      <div class="flex items-center justify-between mt-3 gap-2">
        <span class="font-bold text-sm">
          <template v-if="getDisplayPrice() !== null">
            <span v-if="!isSingleVariantType(product.type)" class="text-[10px] font-normal text-gray-500 block">
              mulai dari
            </span>
            <template v-if="Number(product.discount) > 0">
              <span class="text-xs font-normal text-gray-400 line-through mr-1">
                {{ formatRupiah(getDisplayPrice()) }}
              </span>
              <span class="text-brand-600">
                {{ formatRupiah(getDiscountedPrice()) }}
              </span>
            </template>
            <template v-else>
              {{ formatRupiah(getDisplayPrice()) }}
            </template>
          </template>
          <template v-else>Price</template>
        </span>

        <span
          v-if="isSingleVariantType(product.type)"
          class="rounded-full border border-gray-300 px-3 py-0.5 text-xs whitespace-nowrap"
        >
          {{ getDisplaySize() || 'Size' }}
        </span>
        <span
          v-else
          class="rounded-full border border-brand-600 text-brand-600 px-3 py-0.5 text-xs whitespace-nowrap"
        >
          Choose Size
        </span>
      </div>
    </div>
  </RouterLink>
</template>
