<script setup>
import ProductCard from '@/components/product/ProductCard.vue'

// dummy sementara, nanti diganti hasil GET /products
const featuredProducts = [
  { id: 1, type: 'TYPE1', name: 'Product Name', price: 150000, size: 'Size', image: '', discount: 0 },
  { id: 2, type: 'TYPE2', name: 'Product Name', price: 180000, size: 'Size', image: '', discount: 10 },
  { id: 3, type: 'TYPE2', name: 'Product Name', price: 200000, size: 'Size', image: '', discount: 0 },
  { id: 4, type: 'TYPE3', name: 'Product Name', price: 220000, size: 'Size', image: '', discount: 15 },
]
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="max-w-7xl mx-auto px-6 pt-16 pb-20">
      <h1 class="text-5xl font-extrabold tracking-tight mb-6">Headline</h1>

      <div class="space-y-2 mb-8 max-w-md">
        <div class="h-2 bg-gray-300 rounded-full w-full"></div>
        <div class="h-2 bg-gray-300 rounded-full w-4/5"></div>
        <div class="h-2 bg-gray-300 rounded-full w-3/5"></div>
      </div>

      <div class="flex items-center gap-4">
        <RouterLink
          to="/menu"
          class="rounded-full bg-gray-900 text-white px-6 py-3 text-sm font-semibold hover:bg-gray-700 transition"
        >
          Explore Menu
        </RouterLink>
        <RouterLink
          to="/gallery"
          class="rounded-full border border-gray-900 px-6 py-3 text-sm font-semibold hover:bg-gray-900 hover:text-white transition"
        >
          View Gallery
        </RouterLink>
      </div>
    </section>

    <hr class="border-gray-200" />

    <!-- FEATURED CAKES -->
    <section class="max-w-7xl mx-auto px-6 py-16">
      <h2 class="text-3xl font-extrabold mb-8">Featured Cakes</h2>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <ProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
        />
      </div>

      <div class="flex justify-center mt-10">
        <RouterLink
          to="/menu"
          class="rounded-full border border-gray-900 px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-gray-900 hover:text-white transition"
        >
          View Full Menu →
        </RouterLink>
      </div>
    </section>

    <hr class="border-gray-200" />

    <!-- HOW IT WORKS -->
    <section class="max-w-7xl mx-auto px-6 py-16">
      <p class="text-sm font-semibold text-gray-500 mb-2">How It Works</p>
      <h2 class="text-3xl font-extrabold">Headline</h2>
    </section>
  </div>
</template>