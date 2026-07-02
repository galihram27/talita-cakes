<script setup>
defineProps({
  product: { type: Object, required: true },
})
</script>

<template>
  <div class="border border-gray-200">
    <div class="relative aspect-[3/4] bg-gray-200 flex items-center justify-center">
      <span
        v-if="product.type === 'TYPE1'"
        class="absolute top-2 left-2 rounded-full bg-white border border-gray-300 px-3 py-1 text-xs font-medium"
      >
        Fixed
      </span>
      <span
        v-if="product.discount > 0"
        class="absolute top-2 right-2 rounded-full bg-white border border-gray-300 px-3 py-1 text-xs font-medium"
      >
        Discount
      </span>
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="w-full h-full object-cover"
      />
    </div>

    <div class="p-3 border-t border-gray-200">
      <h3 class="font-bold text-sm">{{ product.name }}</h3>
      <div class="h-px bg-gray-900 my-2"></div>

      <div class="flex items-center justify-between mt-3">
        <span class="font-bold text-sm">
          {{ product.price ? `Rp${product.price.toLocaleString('id-ID')}` : 'Price' }}
        </span>
        <span
          v-if="product.size"
          class="rounded-full border border-gray-300 px-3 py-0.5 text-xs"
        >
          {{ product.size }}
        </span>
      </div>
    </div>
  </div>
</template>