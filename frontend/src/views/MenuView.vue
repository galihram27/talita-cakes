<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProductStore } from '@/stores/product.store'

// ===== STATE =====
const productStore = useProductStore()
const { products } = storeToRefs(productStore)
const isLoading = ref(!productStore.hasLoaded)
const errorMessage = ref('')

const search = ref('')
const activeFilter = ref('ALL') // ALL | TYPE1 | TYPE2 | TYPE3 | TYPE4
// kategori aktif per type, misal { TYPE1: 'Birthday' } — default 'ALL'
const sectionCategory = ref({})

// ===== CONFIG SECTION (label & badge sesuai wireframe) =====
const TYPE_SECTIONS = [
  { key: 'TYPE1', label: 'Fixed', badge: 'Fixed' },
  { key: 'TYPE2', label: 'Custom Flavor', badge: 'Fixed Size' },
  { key: 'TYPE3', label: 'Semi-Custom', badge: 'Choose Size' },
  { key: 'TYPE4', label: 'Fully Custom', badge: 'Choose Size' },
]

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'TYPE1', label: 'Fixed' },
  { key: 'TYPE2', label: 'Custom Flavor' },
  { key: 'TYPE3', label: 'Semi-Custom' },
  { key: 'TYPE4', label: 'Fully Custom' },
]

// type dengan 1 variant fixed (tidak ada pilihan shape & size)
const isSingleVariantType = (type) => type === 'TYPE1' || type === 'TYPE2'

// ===== FETCH PRODUCTS =====
// Data diambil dari store (cache): kunjungan berikutnya langsung tampil,
// refresh berjalan diam-diam di background.
const fetchProducts = async () => {
  errorMessage.value = ''
  try {
    await productStore.ensureLoaded()
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

// Harga setelah diskon (discount dalam persen), rumus sama dengan halaman detail
const getDiscountedPrice = (product) => {
  const price = getDisplayPrice(product)
  if (price === null) return null
  const discount = Number(product.discount ?? 0)
  if (discount <= 0) return price
  return Math.round((price - (price * discount) / 100) * 100) / 100
}

const getDisplaySize = (product) => {
  if (isSingleVariantType(product.type) && product.variants?.[0]) {
    const v = product.variants[0]
    return `${v.shape === 'ROUND' ? 'Round' : 'Square'} ${v.size}cm`
  }
  return null
}

// ===== FILTER + SEARCH (client-side, sederhana) =====
// pilihan kategori per type, diambil dari produk yang ada di type tersebut
const categoriesByType = (typeKey) => {
  const pool = products.value.filter((p) => p.type === typeKey)
  return [...new Set(pool.map((p) => p.category).filter(Boolean))]
}

const getSectionCategory = (typeKey) => sectionCategory.value[typeKey] || 'ALL'
const setSectionCategory = (typeKey, category) => {
  sectionCategory.value = { ...sectionCategory.value, [typeKey]: category }
}

// shape hanya relevan untuk TYPE1/TYPE2 (fixed oleh admin);
// TYPE3/TYPE4 selalu punya Round & Square sehingga tidak ikut dicocokkan
const matchShapeKeyword = (product, keyword) => {
  if (!isSingleVariantType(product.type)) return false
  const shape = product.variants?.[0]?.shape
  return !!shape && shape.toLowerCase().includes(keyword)
}

const filteredProducts = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return products.value.filter((p) => {
    const matchKeyword =
      !keyword || p.name.toLowerCase().includes(keyword) || matchShapeKeyword(p, keyword)
    const matchFilter = activeFilter.value === 'ALL' || p.type === activeFilter.value
    return matchKeyword && matchFilter
  })
})

const sectionsToShow = computed(() => {
  if (activeFilter.value === 'ALL') return TYPE_SECTIONS
  return TYPE_SECTIONS.filter((s) => s.key === activeFilter.value)
})

const productsByType = (typeKey) => {
  const category = getSectionCategory(typeKey)
  return filteredProducts.value.filter(
    (p) => p.type === typeKey && (category === 'ALL' || p.category === category),
  )
}

// grid section kosong bisa karena filter kategori, bukan karena produknya tidak ada
const sectionHasProducts = (typeKey) =>
  filteredProducts.value.some((p) => p.type === typeKey)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-12">
    <!-- HEADLINE -->
    <h1 class="text-4xl font-extrabold mb-2">Menu</h1>
    <p class="text-gray-600 mb-8">
      Pilih kue favoritmu — semua dibuat fresh dengan bahan berkualitas.
    </p>

    <!-- SEARCH + FILTER -->
    <div class="flex flex-wrap items-center gap-3 mb-12">
      <div class="relative w-full sm:w-72">
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
          placeholder="Cari kue..."
          class="w-full rounded-full border border-gray-300 pl-9 pr-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <button
        v-for="f in FILTERS"
        :key="f.key"
        @click="activeFilter = f.key"
        class="rounded-full border px-4 py-2 text-sm font-medium transition"
        :class="activeFilter === f.key
          ? 'bg-brand-600 text-white border-brand-600'
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
        <template v-if="sectionHasProducts(section.key)">
          <!-- SECTION HEADER -->
          <div class="mb-6">
            <h2 class="text-2xl font-extrabold mb-3">{{ section.label }}</h2>

            <!-- FILTER KATEGORI PER TYPE -->
            <div
              v-if="categoriesByType(section.key).length"
              class="flex flex-wrap items-center gap-2"
            >
              <button
                @click="setSectionCategory(section.key, 'ALL')"
                class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                :class="getSectionCategory(section.key) === 'ALL'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'"
              >
                All
              </button>
              <button
                v-for="c in categoriesByType(section.key)"
                :key="c"
                @click="setSectionCategory(section.key, c)"
                class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                :class="getSectionCategory(section.key) === c
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'"
              >
                {{ c }}
              </button>
            </div>
          </div>
          <div class="h-px bg-gray-200 w-full mb-8"></div>

          <!-- EMPTY (karena filter kategori) -->
          <p
            v-if="productsByType(section.key).length === 0"
            class="text-sm text-gray-500"
          >
            Tidak ada produk untuk kategori ini.
          </p>

          <!-- GRID -->
          <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <RouterLink
              v-for="product in productsByType(section.key)"
              :key="product.id"
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
                  {{ section.label }}
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
                    <template v-if="getDisplayPrice(product) !== null">
                      <span v-if="!isSingleVariantType(section.key)" class="text-[10px] font-normal text-gray-500 block">
                        mulai dari
                      </span>
                      <template v-if="Number(product.discount) > 0">
                        <span class="text-xs font-normal text-gray-400 line-through mr-1">
                          {{ formatRupiah(getDisplayPrice(product)) }}
                        </span>
                        <span class="text-brand-600">
                          {{ formatRupiah(getDiscountedPrice(product)) }}
                        </span>
                      </template>
                      <template v-else>
                        {{ formatRupiah(getDisplayPrice(product)) }}
                      </template>
                    </template>
                    <template v-else>Price</template>
                  </span>

                  <span
                    v-if="isSingleVariantType(section.key)"
                    class="rounded-full border border-gray-300 px-3 py-0.5 text-xs whitespace-nowrap"
                  >
                    {{ getDisplaySize(product) || 'Size' }}
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
          </div>
        </template>
      </section>
    </div>
  </div>
</template>