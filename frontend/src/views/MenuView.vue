<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/lib/api'

// ===== STATE =====
const products = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const search = ref('')
const activeFilter = ref('ALL') // ALL | TYPE1 | TYPE2 | TYPE3

// ===== CONFIG SECTION (label & badge sesuai wireframe) =====
const TYPE_SECTIONS = [
  { key: 'TYPE1', label: 'Fixed', badge: 'Fixed' },
  { key: 'TYPE2', label: 'Semi-Custom', badge: 'Choose Size' },
  { key: 'TYPE3', label: 'Fully Custom', badge: 'Choose Size' },
]

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'TYPE1', label: 'Fixed' },
  { key: 'TYPE2', label: 'Semi-Custom' },
  { key: 'TYPE3', label: 'Fully Custom' },
]

// ===== FETCH PRODUCTS =====
const fetchProducts = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/products')
    products.value = data.data || []
  } catch (err) {
    errorMessage.value = 'Gagal memuat produk, silakan coba lagi.'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchProducts)

// ===== HELPERS =====
const formatRupiah = (amount) => `Rp${Number(amount).toLocaleString('id-ID')}`

// Untuk TYPE1: ambil 1 variant. Untuk TYPE2/TYPE3: cari harga termurah.
const getDisplayPrice = (product) => {
  if (!product.variants || product.variants.length === 0) return null
  const prices = product.variants.map((v) => Number(v.price))
  return Math.min(...prices)
}

const getDisplaySize = (product) => {
  if (product.type === 'TYPE1' && product.variants?.[0]) {
    const v = product.variants[0]
    return `${v.shape === 'ROUND' ? 'Round' : 'Square'} ${v.size}cm`
  }
  return null
}

// ===== FILTER + SEARCH (client-side, sederhana) =====
const filteredProducts = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return products.value.filter((p) => {
    const matchKeyword = !keyword || p.name.toLowerCase().includes(keyword)
    const matchFilter = activeFilter.value === 'ALL' || p.type === activeFilter.value
    return matchKeyword && matchFilter
  })
})

const sectionsToShow = computed(() => {
  if (activeFilter.value === 'ALL') return TYPE_SECTIONS
  return TYPE_SECTIONS.filter((s) => s.key === activeFilter.value)
})

const productsByType = (typeKey) =>
  filteredProducts.value.filter((p) => p.type === typeKey)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-12">
    <!-- HEADLINE -->
    <h1 class="text-4xl font-extrabold mb-4">Menu</h1>
    <div class="h-1.5 w-40 bg-gray-900 rounded-full mb-8"></div>

    <!-- SEARCH + FILTER -->
    <div class="flex flex-wrap items-center gap-3 mb-12">
      <div class="relative flex-1 min-w-[200px]">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1110.5 4a6.5 6.5 0 016.5 6.5z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search"
          class="w-full rounded-full border border-gray-300 pl-9 pr-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <button
        v-for="f in FILTERS"
        :key="f.key"
        @click="activeFilter = f.key"
        class="rounded-full border px-4 py-2 text-sm font-medium transition"
        :class="activeFilter === f.key
          ? 'bg-gray-900 text-white border-gray-900'
          : 'border-gray-300 text-gray-700 hover:bg-gray-100'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- ERROR -->
    <p v-if="errorMessage" class="text-red-600 text-sm mb-6">{{ errorMessage }}</p>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-20">
      Memuat menu...
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="text-center text-gray-500 py-20"
    >
      Produk tidak ditemukan.
    </div>

    <!-- SECTIONS -->
    <div v-else class="space-y-16">
      <section v-for="section in sectionsToShow" :key="section.key">
        <template v-if="productsByType(section.key).length > 0">
          <!-- SECTION HEADER -->
          <div class="flex items-center gap-3 mb-6">
            <span
              class="rounded-full border border-gray-400 px-3 py-1 text-[11px] font-semibold tracking-wide"
            >
              {{ section.key.replace('TYPE', 'TYPE ') }}
            </span>
            <h2 class="text-2xl font-extrabold">{{ section.label }}</h2>
          </div>
          <div class="h-px bg-gray-900 w-full mb-8"></div>

          <!-- GRID -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <RouterLink
              v-for="product in productsByType(section.key)"
              :key="product.id"
              :to="{ name: 'product-detail', params: { id: product.id } }"
              class="border border-gray-200 hover:shadow-md transition block"
            >
              <!-- IMAGE -->
              <div class="relative aspect-[3/4] bg-gray-200 flex items-center justify-center overflow-hidden">
                <span
                  class="absolute top-2 left-2 rounded-full bg-white border border-gray-300 px-3 py-1 text-xs font-medium"
                >
                  {{ section.label }}
                </span>
                <span
                  v-if="Number(product.discount) > 0"
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
                <span v-else class="text-gray-400 text-xs">No Image</span>
              </div>

              <!-- INFO -->
              <div class="p-3 border-t border-gray-200">
                <h3 class="font-bold text-sm truncate">{{ product.name }}</h3>
                <div class="h-px bg-gray-900 my-2"></div>

                <div class="flex items-center justify-between mt-3 gap-2">
                  <span class="font-bold text-sm">
                    <template v-if="getDisplayPrice(product) !== null">
                      <span v-if="section.key !== 'TYPE1'" class="text-[10px] font-normal text-gray-500 block">
                        mulai dari
                      </span>
                      {{ formatRupiah(getDisplayPrice(product)) }}
                    </template>
                    <template v-else>Price</template>
                  </span>

                  <span
                    v-if="section.key === 'TYPE1'"
                    class="rounded-full border border-gray-300 px-3 py-0.5 text-xs whitespace-nowrap"
                  >
                    {{ getDisplaySize(product) || 'Size' }}
                  </span>
                  <span
                    v-else
                    class="rounded-full border border-gray-900 px-3 py-0.5 text-xs whitespace-nowrap"
                  >
                    Choose Size
                  </span>
                </div>
              </div>
            </RouterLink>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>