<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onServerPrefetch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '@/stores/product.store'
import { useMenuFilterStore } from '@/stores/menuFilter.store'
import { PRODUCT_CATEGORIES } from '@/config/productOptions'
import { usePageSeo } from '@/composables/usePageSeo'
import ProductCard from '@/components/product/ProductCard.vue'

const { t } = useI18n()

usePageSeo({
  title: 'Menu Kue & Cupcakes',
  description:
    "Jelajahi katalog Talita's Cake — custom cake, cupcakes, brownies, roti & hampers. Pilih ukuran, rasa, filling & topping, lalu pesan via WhatsApp.",
  path: '/menu',
})

const productStore = useProductStore()
const { products } = storeToRefs(productStore)
const isLoading = ref(!productStore.hasLoaded)
const errorMessage = ref('')

// Pilihan filter disimpan di store supaya tidak hilang saat pengunjung membuka
// detail produk lalu menekan tombol kembali. Di sini nilainya disalin ke ref
// lokal agar cepat diubah, lalu disimpan balik ke store saat halaman
// ditinggalkan (lihat persistFilters di bawah).
const filterStore = useMenuFilterStore()

const search = ref(filterStore.search)
const activeFilter = ref(filterStore.activeFilter)
const activeSort = ref(filterStore.activeSort)
const sectionCategory = ref({ ...filterStore.sectionCategory })
const sectionSubcategory = ref({ ...filterStore.sectionSubcategory })

const SORT_OPTIONS = computed(() => [
  { key: 'default', label: t('menu.sort.default') },
  { key: 'az', label: t('menu.sort.az') },
  { key: 'priceAsc', label: t('menu.sort.priceAsc') },
  { key: 'priceDesc', label: t('menu.sort.priceDesc') },
])

// Dropdown urutan dibuat sendiri (bukan <select> bawaan) supaya tampilannya
// bisa diatur. Konsekuensinya, buka-tutupnya harus diurus manual.
const isSortOpen = ref(false)
// Menunjuk ke kotak dropdown, dipakai untuk mengenali klik di luar area itu.
const sortRef = ref(null)
const currentSortLabel = computed(
  () => SORT_OPTIONS.value.find((o) => o.key === activeSort.value)?.label
)
const selectSort = (key) => {
  activeSort.value = key
  isSortOpen.value = false
}
// contains() memeriksa apakah yang diklik masih bagian dari kotak dropdown.
// Kalau di luar, dropdown ditutup — perilaku yang biasa diharapkan pengguna.
const handleClickOutside = (e) => {
  if (isSortOpen.value && sortRef.value && !sortRef.value.contains(e.target)) {
    isSortOpen.value = false
  }
}
const handleSortKeydown = (e) => {
  if (e.key === 'Escape') isSortOpen.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleSortKeydown)
  // Panel filter dibuka otomatis di layar lebar, tapi ditutup di HP
  // supaya tidak menghabiskan layar.
  isFilterOpen.value = window.innerWidth >= 768
})

const loadProducts = async () => {
  try {
    await productStore.ensureLoaded()
  } finally {
    isLoading.value = false
  }
}
onServerPrefetch(loadProducts)
onMounted(loadProducts)
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleSortKeydown)
})

const TYPE_SECTIONS = computed(() =>
  [1, 2, 3, 4, 5, 6].map((num) => ({
    key: `TYPE${num}`,
    label: t(`home.types.t${num}.tag`),
    hint: t(`home.types.t${num}.desc`),
  }))
)

const expandedType = ref(filterStore.expandedType)

const isFilterOpen = ref(true)
const toggleFilter = () => {
  isFilterOpen.value = !isFilterOpen.value
}

const MENU_NOTES = computed(() =>
  ['n1', 'n2', 'n3', 'n4', 'n5'].map((key) => t(`menu.notes.${key}`))
)

const isSingleVariantType = (type) => type === 'TYPE1' || type === 'TYPE2'

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

// Mengumpulkan kategori yang benar-benar ada isinya pada satu tipe produk.
// Set dipakai untuk membuang kategori yang muncul berulang. Hasilnya diurutkan
// mengikuti PRODUCT_CATEGORIES supaya urutannya tetap sama setiap saat;
// kategori yang tidak terdaftar di sana (indexOf -1) ditaruh paling belakang.
const categoriesByType = (typeKey) => {
  const pool = products.value.filter((p) => p.type === typeKey)
  const present = [...new Set(pool.map((p) => p.category).filter(Boolean))]
  const order = PRODUCT_CATEGORIES[typeKey] ?? []
  return present.sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
  })
}

// Tiap tipe produk punya pilihan kategorinya sendiri, jadi disimpan dalam satu
// objek dengan tipe sebagai kuncinya. Objeknya dibuat ulang pakai { ... } agar
// perubahannya terdeteksi Vue. Mengganti kategori otomatis mengembalikan
// subkategori ke 'ALL', karena subkategori lama belum tentu ada di kategori baru.
const getSectionCategory = (typeKey) => sectionCategory.value[typeKey] || 'ALL'
const setSectionCategory = (typeKey, category) => {
  sectionCategory.value = { ...sectionCategory.value, [typeKey]: category }
  sectionSubcategory.value = { ...sectionSubcategory.value, [typeKey]: 'ALL' }
}

const subcategoriesByType = (typeKey) => {
  const category = getSectionCategory(typeKey)
  const pool = products.value.filter(
    (p) => p.type === typeKey && (category === 'ALL' || p.category === category)
  )
  return [...new Set(pool.map((p) => p.subcategory).filter(Boolean))]
}

// Nama subkategori di data ditulis huruf besar semua, jadi diubah agar hanya
// huruf awal tiap kata yang besar (\b menandai awal kata).
const subcategoryLabel = (text) => text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const getSectionSubcategory = (typeKey) => sectionSubcategory.value[typeKey] || 'ALL'
const setSectionSubcategory = (typeKey, subcategory) => {
  sectionSubcategory.value = { ...sectionSubcategory.value, [typeKey]: subcategory }
}

const selectAll = () => {
  activeFilter.value = 'ALL'
  expandedType.value = null
}
const toggleType = (typeKey) => {
  activeFilter.value = typeKey
  expandedType.value = expandedType.value === typeKey ? null : typeKey
}
const selectCategory = (typeKey, category) => {
  activeFilter.value = typeKey
  setSectionCategory(typeKey, category)
}

const matchShapeKeyword = (product, keyword) => {
  if (!isSingleVariantType(product.type)) return false
  const shape = product.variants?.[0]?.shape
  return !!shape && shape.toLowerCase().includes(keyword)
}

// Penyaringan berjenjang. Tahap pertama ini menyaring berdasarkan kata kunci
// dan tipe produk; penyaringan kategori/subkategori dilakukan belakangan
// di productsByType, karena pilihannya berbeda-beda untuk tiap tipe.
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

// Patokan harga untuk pengurutan: harga termurah setelah dipotong diskon.
// Produk tanpa harga diberi Infinity supaya jatuh di urutan paling belakang.
const sortPriceOf = (product) => {
  if (!product.variants?.length) return Infinity
  const min = Math.min(...product.variants.map((v) => Number(v.price)))
  const discount = Number(product.discount ?? 0)
  return discount > 0 ? min - (min * discount) / 100 : min
}

const sortProducts = (list) => {
  // Disalin dulu karena sort() mengubah array aslinya.
  const arr = [...list]
  switch (activeSort.value) {
    case 'az':
      return arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
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
      (subcategory === 'ALL' || p.subcategory === subcategory)
  )
  return sortProducts(list)
}

// Saat filter "semua tipe" aktif dan urutannya masih bawaan, produk dari
// berbagai tipe ditampilkan bercampur. Supaya tidak terlihat acak, urutannya
// mengikuti daftar tipe di bawah ini.
const TYPE_ORDER = ['TYPE1', 'TYPE2', 'TYPE3', 'TYPE4', 'TYPE5', 'TYPE6']
const typeRank = (product) => {
  const index = TYPE_ORDER.indexOf(product.type)
  return index === -1 ? TYPE_ORDER.length : index
}

const mergedProducts = computed(() => {
  if (activeSort.value !== 'default') return sortProducts(filteredProducts.value)
  return [...filteredProducts.value].sort((a, b) => typeRank(a) - typeRank(b))
})

// Isi satu halaman menyesuaikan panel filter: saat panel terbuka ruangnya lebih
// sempit sehingga muat 4 kartu per baris, saat tertutup jadi 5. Dikali 5 baris,
// jadi satu halaman berisi 20 atau 25 produk.
const ROWS_PER_PAGE = 5
const columns = computed(() => (isFilterOpen.value ? 4 : 5))
const pageSize = computed(() => ROWS_PER_PAGE * columns.value)

const currentPage = ref(filterStore.currentPage)

const currentList = computed(() =>
  activeFilter.value === 'ALL' ? mergedProducts.value : productsByType(activeFilter.value)
)

const totalPages = computed(() => Math.max(1, Math.ceil(currentList.value.length / pageSize.value)))

// Memotong daftar sesuai halaman yang sedang dibuka. Halaman 1 mulai dari
// urutan ke-0, halaman 2 dari urutan ke-pageSize, dan seterusnya.
const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return currentList.value.slice(start, start + pageSize.value)
})

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  nextTick(scrollToFilters)
}

// Setiap kali filter berubah, kembali ke halaman 1 — kalau tidak, pengunjung
// bisa terdampar di halaman 5 padahal hasil barunya cuma satu halaman.
// deep: true diperlukan karena sectionCategory berbentuk objek.
watch(
  [activeFilter, search, activeSort, sectionCategory, sectionSubcategory],
  () => {
    currentPage.value = 1
  },
  { deep: true }
)

// Setelah ganti filter atau pindah halaman, layar digeser kembali ke deretan
// filter supaya pengunjung tidak tertinggal di tengah daftar. nextTick menunggu
// tampilannya selesai diperbarui dulu, baru digeser.
const toolbarRef = ref(null)
const scrollToFilters = () => {
  toolbarRef.value?.scrollIntoView({ behavior: 'instant', block: 'start' })
}
watch([activeFilter, sectionCategory, sectionSubcategory], () => nextTick(scrollToFilters), {
  deep: true,
})

// Pengaman: kalau jumlah halaman menyusut (misalnya karena hasil pencarian
// makin sedikit), halaman yang sedang dibuka ditarik ke halaman terakhir.
watch(totalPages, (max) => {
  if (currentPage.value > max) currentPage.value = max
})

// Halaman terakhir biasanya berisi lebih sedikit produk, sehingga area daftar
// mendadak memendek dan tombol halaman ikut melompat ke atas. Untuk mencegahnya,
// tinggi minimal area dihitung sendiri: tinggi kartu tertinggi dikali jumlah
// baris satu halaman penuh, ditambah jarak antar baris.
const gridArea = ref(null)
const gridMinHeight = ref('')

const recalcGridHeight = () => {
  const area = gridArea.value
  if (!area) return
  const grid = area.querySelector('.grid')
  const cards = area.querySelectorAll('[data-product-card]')
  if (!grid || cards.length === 0) {
    gridMinHeight.value = ''
    return
  }

  // Cari kartu yang paling tinggi sebagai patokan tinggi satu baris.
  let rowHeight = 0
  cards.forEach((card) => {
    rowHeight = Math.max(rowHeight, card.offsetHeight)
  })

  // Jumlah kolom dibaca dari CSS yang benar-benar sedang berlaku, bukan
  // ditebak, karena bisa berubah mengikuti lebar layar.
  const styles = getComputedStyle(grid)
  const template = styles.gridTemplateColumns
  if (!template || template === 'none') return
  const cols = template.split(' ').filter(Boolean).length || 1
  const gap = parseFloat(styles.rowGap) || 20
  const rows = Math.max(1, Math.ceil(pageSize.value / cols))
  gridMinHeight.value = `${rows * rowHeight + (rows - 1) * gap}px`
}

// Perhitungan di atas membaca ukuran asli di layar, jadi harus menunggu
// tampilannya selesai digambar lebih dulu.
const scheduleRecalc = () => nextTick(recalcGridHeight)

onMounted(() => {
  scheduleRecalc()
  window.addEventListener('resize', scheduleRecalc)
})

// Menyimpan semua pilihan filter ke store saat halaman ditinggalkan, supaya
// keadaannya kembali seperti semula ketika pengunjung menekan tombol kembali
// dari halaman detail produk.
const persistFilters = () => {
  filterStore.activeFilter = activeFilter.value
  filterStore.search = search.value
  filterStore.activeSort = activeSort.value
  filterStore.sectionCategory = { ...sectionCategory.value }
  filterStore.sectionSubcategory = { ...sectionSubcategory.value }
  filterStore.expandedType = expandedType.value
  filterStore.currentPage = currentPage.value
}

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRecalc)
  persistFilters()
})

// Tinggi area dihitung ulang setiap kali isi atau lebar daftarnya berubah.
watch([pagedProducts, isFilterOpen, activeFilter, currentPage, isLoading], scheduleRecalc)

const sectionHasProducts = (typeKey) => filteredProducts.value.some((p) => p.type === typeKey)

// Mengembalikan seluruh filter ke keadaan awal lewat satu tombol.
const resetMenu = () => {
  search.value = ''
  activeFilter.value = 'ALL'
  activeSort.value = 'default'
  sectionCategory.value = {}
  sectionSubcategory.value = {}
  expandedType.value = null
}
</script>

<template>
  <div class="tc-page max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 pt-12 pb-[72px]">
    <div class="mb-6">
      <h1 class="font-display text-[clamp(38px,5vw,52px)] leading-[1.05]">
        {{ t('menu.heading1') }} <span class="italic text-brand-500">{{ t('menu.heading2') }}</span>
      </h1>
      <p class="mt-3 text-[15px] leading-relaxed text-[#6E5A4D] max-w-[680px]">
        {{ t('menu.subtitle') }}
      </p>
    </div>

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
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          {{ note }}
        </div>
      </div>
    </div>

    <!-- Deretan alat: pencarian, tombol buka-tutup filter, dan pilihan urutan.
         Diberi ref karena inilah titik yang dituju saat layar digeser otomatis
         setelah ganti filter atau pindah halaman. -->
    <div ref="toolbarRef" class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 scroll-mt-24">
      <button
        type="button"
        @click="toggleFilter"
        :aria-expanded="isFilterOpen"
        class="shrink-0 inline-flex items-center justify-center gap-2 border-[1.5px] rounded-full px-4 py-3 text-[14px] font-bold transition-colors"
        :class="
          isFilterOpen
            ? 'bg-brand-500 text-white border-brand-500'
            : 'bg-white text-cocoa-900 border-[#E4D3C1] hover:border-brand-500'
        "
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {{ t('menu.filter.label') }}
      </button>

      <div class="relative w-full sm:w-[420px]">
        <span
          class="absolute left-4 top-1/2 -translate-y-1/2 text-[#B7A18E] pointer-events-none flex"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          v-model="search"
          type="text"
          :placeholder="t('menu.searchPlaceholder')"
          class="w-full border-[1.5px] border-[#E4D3C1] rounded-full py-3 pl-11 pr-10 text-[14.5px] bg-white text-cocoa-900 placeholder-[#B7A18E] focus:outline-none focus:border-brand-500"
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

      <!-- Dropdown urutan buatan sendiri. ref di sini yang dipakai untuk
           mengenali klik di luar area dropdown supaya bisa ditutup. -->
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="4" y1="7" x2="14" y2="7" />
              <line x1="4" y1="12" x2="11" y2="12" />
              <line x1="4" y1="17" x2="8" y2="17" />
              <polyline points="16 15 19 18 22 15" />
              <line x1="19" y1="6" x2="19" y2="18" />
            </svg>
          </span>
          <span class="text-cocoa-400 font-semibold hidden sm:inline"
            >{{ t('menu.sort.label') }}:</span
          >
          <span class="font-bold text-cocoa-900 mr-auto sm:mr-0">{{ currentSortLabel }}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-cocoa-400 shrink-0 transition-transform"
            :class="isSortOpen ? 'rotate-180' : ''"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
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
              :class="
                activeSort === opt.key
                  ? 'bg-brand-50 text-brand-500'
                  : 'text-cocoa-900 hover:bg-[#F7EEE6]'
              "
            >
              {{ opt.label }}
              <svg
                v-if="activeSort === opt.key"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-6 md:gap-8">
      <!-- Panel filter di samping kiri. Tiap tipe bisa dibuka untuk
           memperlihatkan kategori dan subkategori di dalamnya. -->
      <aside v-if="isFilterOpen" class="md:w-[248px] md:shrink-0">
        <nav
          class="bg-white border border-[#EFE0D2] rounded-2xl p-2 shadow-[0_6px_22px_rgba(51,38,31,0.05)]"
        >
          <button
            type="button"
            @click="selectAll"
            class="w-full text-left rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition-colors"
            :class="
              activeFilter === 'ALL'
                ? 'bg-brand-500 text-white'
                : 'text-cocoa-900 hover:bg-[#F7EEE6]'
            "
          >
            {{ t('common.all') }}
          </button>

          <div v-for="section in TYPE_SECTIONS" :key="section.key">
            <button
              type="button"
              @click="toggleType(section.key)"
              :aria-expanded="expandedType === section.key"
              class="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold text-left transition-colors"
              :class="
                activeFilter === section.key
                  ? 'bg-brand-500 text-white'
                  : 'text-cocoa-900 hover:bg-[#F7EEE6]'
              "
            >
              <span class="flex-1 min-w-0">{{ section.label }}</span>
              <!-- Panah hanya muncul pada tipe yang punya kategori,
                   supaya tidak ada tombol yang ditekan tapi tidak terjadi apa-apa. -->
              <svg
                v-if="categoriesByType(section.key).length"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0 transition-transform"
                :class="expandedType === section.key ? 'rotate-180' : ''"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div
              v-if="expandedType === section.key && categoriesByType(section.key).length"
              class="mt-1 mb-1.5 ml-3.5 pl-3 border-l border-[#EFE0D2] flex flex-col gap-0.5"
            >
              <button
                type="button"
                @click="selectCategory(section.key, 'ALL')"
                class="text-left rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors"
                :class="
                  getSectionCategory(section.key) === 'ALL'
                    ? 'bg-brand-50 text-brand-500'
                    : 'text-cocoa-500 hover:bg-[#F7EEE6] hover:text-cocoa-900'
                "
              >
                {{ t('common.all') }}
              </button>
              <button
                v-for="c in categoriesByType(section.key)"
                :key="c"
                type="button"
                @click="selectCategory(section.key, c)"
                class="text-left rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors"
                :class="
                  getSectionCategory(section.key) === c
                    ? 'bg-brand-50 text-brand-500'
                    : 'text-cocoa-500 hover:bg-[#F7EEE6] hover:text-cocoa-900'
                "
              >
                {{ c }}
              </button>

              <div
                v-if="subcategoriesByType(section.key).length"
                class="mt-1 ml-3 pl-3 border-l border-[#EFE0D2] flex flex-col gap-0.5"
              >
                <button
                  type="button"
                  @click="setSectionSubcategory(section.key, 'ALL')"
                  class="text-left rounded-lg px-3 py-1 text-[11.5px] font-bold transition-colors"
                  :class="
                    getSectionSubcategory(section.key) === 'ALL'
                      ? 'text-cocoa-900'
                      : 'text-cocoa-400 hover:text-cocoa-900'
                  "
                >
                  {{ t('common.all') }}
                </button>
                <button
                  v-for="sc in subcategoriesByType(section.key)"
                  :key="sc"
                  type="button"
                  @click="setSectionSubcategory(section.key, sc)"
                  class="text-left rounded-lg px-3 py-1 text-[11.5px] font-bold transition-colors"
                  :class="
                    getSectionSubcategory(section.key) === sc
                      ? 'text-cocoa-900'
                      : 'text-cocoa-400 hover:text-cocoa-900'
                  "
                >
                  {{ subcategoryLabel(sc) }}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <div class="flex-1 min-w-0">
        <p v-if="errorMessage" class="text-brand-600 text-sm mb-6">{{ errorMessage }}</p>

        <div v-if="isLoading" class="text-center text-cocoa-400 py-20">
          {{ t('menu.loading') }}
        </div>

        <div
          v-else-if="filteredProducts.length === 0"
          class="text-center bg-white border border-dashed border-[#E4D3C1] rounded-2xl py-14 px-6 text-cocoa-400"
        >
          <div class="text-[34px] mb-2.5">🔍</div>
          <div class="font-display text-[22px] text-cocoa-900 mb-1.5">
            {{ t('menu.emptyTitle') }}
          </div>
          <p class="mb-4 text-[14.5px]">{{ t('menu.emptyDesc') }}</p>
          <button
            @click="resetMenu"
            class="bg-brand-500 text-white font-extrabold text-sm px-5 py-2.5 rounded-full hover:bg-brand-600 transition-colors"
          >
            {{ t('menu.reset') }}
          </button>
        </div>

        <!-- Area daftar produk. minHeight-nya diisi hasil hitungan di script
             supaya tingginya tetap walau halaman terakhir isinya sedikit. -->
        <div v-else ref="gridArea" :style="{ minHeight: gridMinHeight }">
          <!-- Dua bentuk tampilan: saat filter "semua", produk ditampilkan
               bercampur dalam satu grid; saat satu tipe dipilih, produknya
               dikelompokkan per bagian dengan keterangan tipe di atasnya. -->
          <div
            v-if="activeFilter === 'ALL'"
            class="grid grid-cols-2 gap-5"
            :class="isFilterOpen ? 'md:grid-cols-4' : 'md:grid-cols-5'"
          >
            <ProductCard v-for="product in pagedProducts" :key="product.id" :product="product" />
          </div>

          <div v-else class="flex flex-col gap-11">
            <section v-for="section in sectionsToShow" :key="section.key">
              <template v-if="sectionHasProducts(section.key)">
                <div class="border-b border-cream-300 pb-3 mb-4">
                  <span class="block text-[13px] text-cocoa-400 font-bold">
                    {{ section.hint }}
                  </span>
                </div>

                <p v-if="productsByType(section.key).length === 0" class="text-sm text-cocoa-400">
                  {{ t('menu.emptyCategory') }}
                </p>

                <div
                  v-else
                  class="grid grid-cols-2 gap-5"
                  :class="isFilterOpen ? 'md:grid-cols-4' : 'md:grid-cols-5'"
                >
                  <ProductCard
                    v-for="product in pagedProducts"
                    :key="product.id"
                    :product="product"
                  />
                </div>
              </template>
            </section>
          </div>
        </div>

        <!-- Tombol halaman. Hanya tampil kalau isinya memang lebih dari satu
             halaman. Tombol panah dimatikan saat sudah di halaman pertama
             atau terakhir. -->
        <div
          v-if="!isLoading && totalPages > 1"
          class="flex items-center justify-center gap-1.5 mt-9"
        >
          <button
            type="button"
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            :aria-label="t('menu.page.prev')"
            class="w-9 h-9 rounded-full border border-[#E4D3C1] bg-white text-cocoa-900 flex items-center justify-center transition-colors hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:pointer-events-none"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            v-for="page in totalPages"
            :key="page"
            type="button"
            @click="goToPage(page)"
            class="min-w-9 h-9 px-3 rounded-full border text-[13px] font-bold transition-colors"
            :class="
              currentPage === page
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-cocoa-900 border-[#E4D3C1] hover:border-brand-500 hover:text-brand-500'
            "
          >
            {{ page }}
          </button>

          <button
            type="button"
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            :aria-label="t('menu.page.next')"
            class="w-9 h-9 rounded-full border border-[#E4D3C1] bg-white text-cocoa-900 flex items-center justify-center transition-colors hover:border-brand-500 hover:text-brand-500 disabled:opacity-40 disabled:pointer-events-none"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tc-drop-enter-active,
.tc-drop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.tc-drop-enter-from,
.tc-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
