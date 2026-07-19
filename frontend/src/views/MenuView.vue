<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '@/stores/product.store'
import ProductCard from '@/components/product/ProductCard.vue'

const { t } = useI18n()

// ===== STATE =====
const productStore = useProductStore()
const { products } = storeToRefs(productStore)
const isLoading = ref(!productStore.hasLoaded)
const errorMessage = ref('')

const search = ref('')
const activeFilter = ref('ALL') // ALL | TYPE1 | TYPE2 | TYPE3 | TYPE4 | TYPE5
const activeSort = ref('default') // default | az | priceAsc | priceDesc
// kategori aktif per type, misal { TYPE1: 'Birthday' } — default 'ALL'
const sectionCategory = ref({})
// sub-kategori aktif per type (level-2, dipakai TYPE5) — default 'ALL'
const sectionSubcategory = ref({})

// Opsi pengurutan untuk dropdown di sebelah kotak pencarian
const SORT_OPTIONS = computed(() => [
  { key: 'default', label: t('menu.sort.default') },
  { key: 'az', label: t('menu.sort.az') },
  { key: 'priceAsc', label: t('menu.sort.priceAsc') },
  { key: 'priceDesc', label: t('menu.sort.priceDesc') },
])

// ===== DROPDOWN SORT (custom, bukan <select> native) =====
const isSortOpen = ref(false)
const sortRef = ref(null)
const currentSortLabel = computed(
  () => SORT_OPTIONS.value.find((o) => o.key === activeSort.value)?.label,
)
const selectSort = (key) => {
  activeSort.value = key
  isSortOpen.value = false
}
// Tutup dropdown saat klik di luar area-nya
const handleClickOutside = (e) => {
  if (isSortOpen.value && sortRef.value && !sortRef.value.contains(e.target)) {
    isSortOpen.value = false
  }
}
// Tutup dropdown dengan tombol Esc
const handleSortKeydown = (e) => {
  if (e.key === 'Escape') isSortOpen.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleSortKeydown)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleSortKeydown)
})

// ===== CONFIG SECTION (label & hint sesuai desain) =====
// label & hint memakai kamus yang sama dengan kartu tipe di HomeView
const TYPE_SECTIONS = computed(() =>
  [1, 2, 3, 4, 5, 6].map((num) => ({
    key: `TYPE${num}`,
    num,
    label: t(`home.types.t${num}.tag`),
    hint: t(`home.types.t${num}.desc`),
  }))
)

const FILTERS = computed(() => [
  { key: 'ALL', label: t('common.all') },
  { key: 'TYPE1', label: t('home.types.t1.tag') },
  { key: 'TYPE2', label: t('home.types.t2.tag') },
  { key: 'TYPE3', label: t('home.types.t3.tag') },
  { key: 'TYPE4', label: t('home.types.t4.tag') },
  { key: 'TYPE5', label: t('home.types.t5.tag') },
  { key: 'TYPE6', label: t('home.types.t6.tag') },
])

// Catatan sebelum memesan (dari desain)
const MENU_NOTES = computed(() =>
  ['n1', 'n2', 'n3', 'n4', 'n5'].map((key) => t(`menu.notes.${key}`))
)

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
    errorMessage.value = t('menu.error')
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
  // ganti kategori -> reset sub-kategori supaya tidak nyangkut dari kategori lama
  sectionSubcategory.value = { ...sectionSubcategory.value, [typeKey]: 'ALL' }
}

// sub-kategori (level-2) yang tersedia di type tsb. Kalau kategori masih 'ALL',
// tampilkan seluruh sub-kategori; kalau sudah dipilih, persempit ke kategori itu.
const subcategoriesByType = (typeKey) => {
  const category = getSectionCategory(typeKey)
  const pool = products.value.filter(
    (p) => p.type === typeKey && (category === 'ALL' || p.category === category),
  )
  return [...new Set(pool.map((p) => p.subcategory).filter(Boolean))]
}

// Sub-kategori disimpan KAPITAL SEMUA di database (mis. "CINROLLS VAN DEPOK").
// Untuk chip filter ditampilkan Title Case supaya lebih enak dibaca. Hanya
// tampilannya yang berubah — penyaringan tetap memakai nilai aslinya.
const subcategoryLabel = (text) =>
  text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const getSectionSubcategory = (typeKey) => sectionSubcategory.value[typeKey] || 'ALL'
const setSectionSubcategory = (typeKey, subcategory) => {
  sectionSubcategory.value = { ...sectionSubcategory.value, [typeKey]: subcategory }
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
  if (activeFilter.value === 'ALL') return TYPE_SECTIONS.value
  return TYPE_SECTIONS.value.filter((s) => s.key === activeFilter.value)
})


const sortPriceOf = (product) => {
  if (!product.variants?.length) return Infinity
  const min = Math.min(...product.variants.map((v) => Number(v.price)))
  const discount = Number(product.discount ?? 0)
  return discount > 0 ? min - (min * discount) / 100 : min
}


const sortProducts = (list) => {
  const arr = [...list]
  switch (activeSort.value) {
    case 'az':
      return arr.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
    case 'priceAsc':
      return arr.sort((a, b) => sortPriceOf(a) - sortPriceOf(b))
    case 'priceDesc':
      return arr.sort((a, b) => sortPriceOf(b) - sortPriceOf(a))
    default:
      return arr
  }
}

const productsByType = (typeKey) => {
  const category = getSectionCategory(typeKey)
  const subcategory = getSectionSubcategory(typeKey)
  const list = filteredProducts.value.filter(
    (p) =>
      p.type === typeKey &&
      (category === 'ALL' || p.category === category) &&
      (subcategory === 'ALL' || p.subcategory === subcategory),
  )
  return sortProducts(list)
}


const sectionHasProducts = (typeKey) =>
  filteredProducts.value.some((p) => p.type === typeKey)

const resetMenu = () => {
  search.value = ''
  activeFilter.value = 'ALL'
  activeSort.value = 'default'
  sectionCategory.value = {}
  sectionSubcategory.value = {}
}
</script>

<template>
  <div class="tc-page max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-[72px]">
    <!-- HEADLINE -->
    <div class="mb-6">
      <h1 class="font-display text-[clamp(38px,5vw,52px)] leading-[1.05]">
        {{ t('menu.heading1') }} <span class="italic text-brand-500">{{ t('menu.heading2') }}</span>
      </h1>
      <p class="mt-3 text-[15px] leading-relaxed text-[#6E5A4D] max-w-[680px]">
        {{ t('menu.subtitle') }}
      </p>
    </div>

    <!-- BEFORE YOU ORDER -->
    <div
      class="relative mb-8 bg-[#FFFBF7] border border-[#EFE0D2] rounded-3xl p-6 md:p-8 shadow-[0_6px_22px_rgba(51,38,31,0.06)]"
    >
      <div class="mb-5">
        <div class="font-display text-[26px] leading-tight">{{ t('menu.beforeTitle') }}</div>
        <div class="text-[13px] text-[#8A7362] mt-1">
          {{ t('menu.beforeSubtitle') }}
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

    <!-- SEARCH + SORT -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      <!-- SEARCH -->
      <div class="relative w-full sm:w-[420px]">
        <span
          class="absolute left-4 top-1/2 -translate-y-1/2 text-[#B7A18E] pointer-events-none flex"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        </span>
        <input
          v-model="search"
          type="text"
          :placeholder="t('menu.searchPlaceholder')"
          class="w-full border-[1.5px] border-[#E4D3C1] rounded-full py-3 pl-11 pr-10 text-[14.5px] bg-white text-cocoa-900 placeholder-[#B7A18E]"
        />
        <button
          v-if="search"
          @click="search = ''"
          :title="t('menu.clearSearch')"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F0E3D6] text-[#6E5A4D] text-xs flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- SORT (dropdown custom) -->
      <div ref="sortRef" class="relative shrink-0">
        <button
          type="button"
          @click="isSortOpen = !isSortOpen"
          :aria-label="t('menu.sort.label')"
          :aria-expanded="isSortOpen"
          class="w-full sm:w-auto inline-flex items-center gap-2.5 border-[1.5px] rounded-full pl-4 pr-3.5 py-3 text-[14px] bg-white transition-colors"
          :class="isSortOpen ? 'border-brand-500' : 'border-[#E4D3C1] hover:border-brand-500'"
        >
          <span class="text-[#B7A18E] flex shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="14" y2="7" /><line x1="4" y1="12" x2="11" y2="12" /><line x1="4" y1="17" x2="8" y2="17" /><polyline points="16 15 19 18 22 15" /><line x1="19" y1="6" x2="19" y2="18" /></svg>
          </span>
          <span class="text-cocoa-400 font-semibold hidden sm:inline">{{ t('menu.sort.label') }}:</span>
          <span class="font-bold text-cocoa-900 mr-auto sm:mr-0">{{ currentSortLabel }}</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
            class="text-cocoa-400 shrink-0 transition-transform"
            :class="isSortOpen ? 'rotate-180' : ''"
          ><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        <Transition name="tc-drop">
          <div
            v-if="isSortOpen"
            class="absolute right-0 sm:left-0 top-[calc(100%+8px)] min-w-full sm:min-w-[220px] bg-white border border-cream-300 rounded-2xl shadow-[0_14px_34px_-12px_rgba(51,38,31,0.35)] p-1.5 z-30"
          >
            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.key"
              type="button"
              @click="selectSort(opt.key)"
              class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-bold text-left transition-colors"
              :class="activeSort === opt.key
                ? 'bg-brand-50 text-brand-500'
                : 'text-cocoa-900 hover:bg-[#F7EEE6]'"
            >
              {{ opt.label }}
              <svg
                v-if="activeSort === opt.key"
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"
              ><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          </div>
        </Transition>
      </div>
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
      {{ t('menu.loading') }}
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="text-center bg-white border border-dashed border-[#E4D3C1] rounded-2xl py-14 px-6 text-cocoa-400"
    >
      <div class="text-[34px] mb-2.5">🔍</div>
      <div class="font-display text-[22px] text-cocoa-900 mb-1.5">{{ t('menu.emptyTitle') }}</div>
      <p class="mb-4 text-[14.5px]">{{ t('menu.emptyDesc') }}</p>
      <button
        @click="resetMenu"
        class="bg-brand-500 text-white font-extrabold text-sm px-5 py-2.5 rounded-full hover:bg-brand-600 transition-colors"
      >
        {{ t('menu.reset') }}
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
                {{ t('common.all') }}
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

            <!-- FILTER SUB-KATEGORI (level-2, muncul saat kategori dipilih; mis. TYPE5) -->
            <div
              v-if="subcategoriesByType(section.key).length"
              class="flex flex-wrap items-center gap-2 mt-2.5 pl-[38px]"
            >
              <button
                @click="setSectionSubcategory(section.key, 'ALL')"
                class="rounded-full border px-[13px] py-1 text-[11.5px] font-bold transition-colors"
                :class="getSectionSubcategory(section.key) === 'ALL'
                  ? 'bg-cocoa-900 text-white border-cocoa-900'
                  : 'bg-white text-cocoa-500 border-[#E4D3C1] hover:border-cocoa-900 hover:text-cocoa-900'"
              >
                {{ t('common.all') }}
              </button>
              <button
                v-for="sc in subcategoriesByType(section.key)"
                :key="sc"
                @click="setSectionSubcategory(section.key, sc)"
                class="rounded-full border px-[13px] py-1 text-[11.5px] font-bold transition-colors"
                :class="getSectionSubcategory(section.key) === sc
                  ? 'bg-cocoa-900 text-white border-cocoa-900'
                  : 'bg-white text-cocoa-500 border-[#E4D3C1] hover:border-cocoa-900 hover:text-cocoa-900'"
              >
                {{ subcategoryLabel(sc) }}
              </button>
            </div>
          </div>

          <!-- EMPTY (karena filter kategori) -->
          <p
            v-if="productsByType(section.key).length === 0"
            class="text-sm text-cocoa-400"
          >
            {{ t('menu.emptyCategory') }}
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

<style scoped>
.tc-drop-enter-active,
.tc-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tc-drop-enter-from,
.tc-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
