<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useProductStore } from '@/stores/product.store'
import ProductCard from '@/components/product/ProductCard.vue'

// ===== STATE =====
const productStore = useProductStore()
const { products } = storeToRefs(productStore)
const isLoading = ref(!productStore.hasLoaded)
const errorMessage = ref('')

const search = ref('')
const activeFilter = ref('ALL') // ALL | TYPE1 | TYPE2 | TYPE3 | TYPE4
// kategori aktif per type, misal { TYPE1: 'Birthday' } — default 'ALL'
const sectionCategory = ref({})

// ===== CONFIG SECTION (label & hint sesuai desain) =====
const TYPE_SECTIONS = [
  {
    key: 'TYPE1',
    num: 1,
    label: 'Signature Collection',
    hint: 'Perfect for customers who love our ready-made designs.',
  },
  {
    key: 'TYPE2',
    num: 2,
    label: 'Flavor & Design Choice',
    hint: 'Choose your favorite flavor while keeping the original cake size.',
  },
  {
    key: 'TYPE3',
    num: 3,
    label: 'Choose Your Size',
    hint: 'Love the design but need a different size?',
  },
  {
    key: 'TYPE4',
    num: 4,
    label: 'Fully Custom Cake',
    hint: "Create a cake that's uniquely yours.",
  },
]

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'TYPE1', label: 'Signature Collection' },
  { key: 'TYPE2', label: 'Flavor & Design Choice' },
  { key: 'TYPE3', label: 'Choose Your Size' },
  { key: 'TYPE4', label: 'Fully Custom Cake' },
]

// Catatan sebelum memesan (dari desain)
const MENU_NOTES = [
  'Minimum pre-order: H-3',
  'Large & custom cakes: please order earlier',
  'Delivery available within a 25 km radius',
  'Self-pickup is available',
  'Final confirmation will be completed via WhatsApp',
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

const resetMenu = () => {
  search.value = ''
  activeFilter.value = 'ALL'
  sectionCategory.value = {}
}
</script>

<template>
  <div class="tc-page max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-[72px]">
    <!-- HEADLINE -->
    <div class="mb-6">
      <h1 class="font-display text-[clamp(38px,5vw,52px)] leading-[1.05]">
        Our <span class="italic text-brand-500">Menu</span>
      </h1>
      <p class="mt-3 text-[15px] leading-relaxed text-[#6E5A4D] max-w-[680px]">
        Choose from our signature collection or design your own custom cake.
        Every order is freshly baked with love, just for your special
        celebration.
      </p>
    </div>

    <!-- BEFORE YOU ORDER -->
    <div
      class="relative mb-8 bg-[#FFFBF7] border border-[#EFE0D2] rounded-3xl p-6 md:p-8 shadow-[0_6px_22px_rgba(51,38,31,0.06)]"
    >
      <div class="mb-5">
        <div class="font-display text-[26px] leading-tight">Before You Order</div>
        <div class="text-[13px] text-[#8A7362] mt-1">
          Everything you need to know before placing your order.
        </div>
      </div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <div
          v-for="note in MENU_NOTES"
          :key="note"
          class="flex items-center gap-3 text-sm text-[#4A3A2F] px-4 py-3.5 bg-white border border-[#F0E4D8] rounded-[14px] hover:border-[#E7C7BF] hover:shadow-[0_8px_18px_-10px_rgba(152,41,43,0.35)] transition-all"
        >
          <span
            class="shrink-0 w-[26px] h-[26px] rounded-full bg-[#E9F6EE] text-[#2E9E6B] flex items-center justify-center"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          {{ note }}
        </div>
      </div>
    </div>

    <!-- SEARCH -->
    <div class="relative max-w-[480px] mb-5">
      <span
        class="absolute left-4 top-1/2 -translate-y-1/2 text-[#B7A18E] pointer-events-none flex"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      </span>
      <input
        v-model="search"
        type="text"
        placeholder="Search cakes…"
        class="w-full border-[1.5px] border-[#E4D3C1] rounded-full py-3 pl-11 pr-10 text-[14.5px] bg-white text-cocoa-900 placeholder-[#B7A18E]"
      />
      <button
        v-if="search"
        @click="search = ''"
        title="Clear search"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F0E3D6] text-[#6E5A4D] text-xs flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>

    <!-- FILTER TIPE -->
    <div class="flex gap-2 flex-wrap mb-8">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        @click="activeFilter = f.key"
        class="rounded-full border px-[18px] py-2 text-[13.5px] font-bold transition-colors"
        :class="activeFilter === f.key
          ? 'bg-brand-500 text-white border-brand-500'
          : 'bg-white text-cocoa-900 border-[#E4D3C1] hover:bg-brand-500 hover:text-white hover:border-brand-500'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- ERROR -->
    <p v-if="errorMessage" class="text-brand-600 text-sm mb-6">{{ errorMessage }}</p>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-20">
      Memuat menu...
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="text-center bg-white border border-dashed border-[#E4D3C1] rounded-2xl py-14 px-6 text-cocoa-400"
    >
      <div class="text-[34px] mb-2.5">🔍</div>
      <div class="font-display text-[22px] text-cocoa-900 mb-1.5">No cakes match</div>
      <p class="mb-4 text-[14.5px]">Try another keyword or change the category.</p>
      <button
        @click="resetMenu"
        class="bg-brand-500 text-white font-extrabold text-sm px-5 py-2.5 rounded-full hover:bg-brand-600 transition-colors"
      >
        Reset search
      </button>
    </div>

    <!-- SECTIONS -->
    <div v-else class="flex flex-col gap-11">
      <section v-for="section in sectionsToShow" :key="section.key">
        <template v-if="sectionHasProducts(section.key)">
          <!-- SECTION HEADER -->
          <div class="border-b border-cream-300 pb-3 mb-4">
            <div class="flex items-baseline gap-3 flex-wrap">
              <span
                class="w-[26px] h-[26px] rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-[13px] shrink-0"
              >
                {{ section.num }}
              </span>
              <h2 class="font-display text-[25px]">{{ section.label }}</h2>
            </div>
            <span class="block text-[13px] text-cocoa-400 font-bold mt-1.5 pl-[38px]">
              {{ section.hint }}
            </span>

            <!-- FILTER KATEGORI PER TYPE -->
            <div
              v-if="categoriesByType(section.key).length"
              class="flex flex-wrap items-center gap-2 mt-3.5"
            >
              <button
                @click="setSectionCategory(section.key, 'ALL')"
                class="rounded-full border px-[15px] py-1.5 text-[12.5px] font-bold transition-colors"
                :class="getSectionCategory(section.key) === 'ALL'
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-cocoa-900 border-[#E4D3C1] hover:border-brand-500 hover:bg-[#FBEFEC] hover:text-brand-500'"
              >
                All
              </button>
              <button
                v-for="c in categoriesByType(section.key)"
                :key="c"
                @click="setSectionCategory(section.key, c)"
                class="rounded-full border px-[15px] py-1.5 text-[12.5px] font-bold transition-colors"
                :class="getSectionCategory(section.key) === c
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-cocoa-900 border-[#E4D3C1] hover:border-brand-500 hover:bg-[#FBEFEC] hover:text-brand-500'"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <!-- EMPTY (karena filter kategori) -->
          <p
            v-if="productsByType(section.key).length === 0"
            class="text-sm text-cocoa-400"
          >
            Tidak ada produk untuk kategori ini.
          </p>

          <!-- GRID -->
          <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-5">
            <ProductCard
              v-for="product in productsByType(section.key)"
              :key="product.id"
              :product="product"
            />
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
