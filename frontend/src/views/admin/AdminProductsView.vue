<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, Pencil, Trash2, ChevronDown } from 'lucide-vue-next'
import { deleteProduct } from '@/services/product.service'
import { useProductStore } from '@/stores/product.store'
import { useAnalyticsStore } from '@/stores/analytics.store'
import ProductFormModal from '@/components/admin/ProductFormModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Toast from '@/components/common/Toast.vue'

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All types' },
  { value: 'TYPE1', label: 'Type 1' },
  { value: 'TYPE2', label: 'Type 2' },
  { value: 'TYPE3', label: 'Type 3' },
  { value: 'TYPE4', label: 'Type 4' },
]

// Nama singkat per tipe untuk kolom "Tipe" (mis. "Tipe 1 · Shortcake Series")
const TYPE_SHORT_NAMES = {
  TYPE1: 'Shortcake Series',
  TYPE2: 'Petite Cake',
  TYPE3: 'Original Cake',
  TYPE4: 'Custom Cake',
}

// Kategori panjang dari backend dipendekkan supaya tabel tetap rapi
const CATEGORY_SHORT_NAMES = {
  'Signature Shortcake Series': 'Shortcake Series',
  'Simple Decor Petite Cake': 'Simple Decor',
  'Paper Topper Petite Cake': 'Paper Topper',
  'Custom 2D Petite Cake': 'Custom 2D',
  'Signature Original Cake': 'Original Cake',
  'Signature Custom Cake': 'Custom Cake',
}

const errorMessage = ref('')
const deletingId = ref(null)
const toastMessage = ref('')

const searchQuery = ref('')
const selectedType = ref('ALL')

// modal add / edit produk
const isModalOpen = ref(false)
const editingProduct = ref(null)

const openAddModal = () => {
  editingProduct.value = null
  isModalOpen.value = true
}

const openEditModal = (product) => {
  editingProduct.value = product
  isModalOpen.value = true
}

// Data produk diambil dari cache store yang sama dengan halaman Menu
// (stale-while-revalidate): kunjungan kedua langsung tampil tanpa loading.
const productStore = useProductStore()
const analyticsStore = useAnalyticsStore()

const products = computed(() => productStore.products)
// Loading hanya saat cache belum pernah terisi sama sekali
const isLoading = computed(() => !productStore.hasLoaded && !errorMessage.value)

const handleSaved = () => {
  // editingProduct masih menyimpan mode saat modal ter-submit (null = tambah)
  toastMessage.value = editingProduct.value
    ? 'Edit product successfully'
    : 'Add product successfully'
  // refresh cache bersama tanpa mengosongkannya — halaman Menu ikut ter-update
  productStore.refresh().catch(() => {})
  analyticsStore.invalidate() // angka "Jumlah Produk" di dashboard ikut segar
}

const fetchProducts = async () => {
  errorMessage.value = ''
  try {
    await productStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Failed to load product data'
  }
}

onMounted(fetchProducts)

// shape hanya relevan untuk TYPE1/TYPE2 (fixed oleh admin);
// TYPE3/TYPE4 selalu punya Round & Square sehingga tidak ikut dicocokkan
const matchShapeKeyword = (product, keyword) => {
  if (product.type !== 'TYPE1' && product.type !== 'TYPE2') return false
  const shape = product.variants?.[0]?.shape
  return !!shape && shape.toLowerCase().includes(keyword)
}

const filteredProducts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return products.value.filter((product) => {
    const matchesType = selectedType.value === 'ALL' || product.type === selectedType.value
    const matchesKeyword =
      !keyword ||
      product.name?.toLowerCase().includes(keyword) ||
      product.description?.toLowerCase().includes(keyword) ||
      product.flavor?.toLowerCase().includes(keyword) ||
      product.category?.toLowerCase().includes(keyword) ||
      matchShapeKeyword(product, keyword)

    return matchesType && matchesKeyword
  })
})

const typeCell = (product) => {
  const num = product.type?.replace('TYPE', '')
  const shortName = TYPE_SHORT_NAMES[product.type]
  return shortName ? `Type ${num} · ${shortName}` : product.type
}

const categoryCell = (product) =>
  CATEGORY_SHORT_NAMES[product.category] || product.category || '—'

// Harga termurah setelah diskon (rumus sama dengan ProductCard)
const priceLabel = (product) => {
  const prices = product.variants?.map((v) => Number(v.price)) ?? []
  if (prices.length === 0) return '—'

  const discount = Number(product.discount ?? 0)
  const applyDiscount = (price) =>
    discount > 0 ? Math.round((price - (price * discount) / 100) * 100) / 100 : price

  const min = applyDiscount(Math.min(...prices))
  const formatted = `Rp${min.toLocaleString('id-ID')}`

  return prices.length > 1 && Math.max(...prices) !== Math.min(...prices)
    ? `From ${formatted}`
    : formatted
}

// konfirmasi hapus produk via pop-up (bukan confirm bawaan browser)
const productToDelete = ref(null)

const askDelete = (product) => {
  productToDelete.value = product
}

const cancelDelete = () => {
  if (deletingId.value) return
  productToDelete.value = null
}

const confirmDelete = async () => {
  const product = productToDelete.value
  if (!product) return

  deletingId.value = product.id
  try {
    await deleteProduct(product.id)
    // hapus langsung dari cache supaya UI update seketika, lalu sinkronkan
    productStore.products = productStore.products.filter((p) => p.id !== product.id)
    productStore.refresh().catch(() => {})
    analyticsStore.invalidate()
    productToDelete.value = null
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete product')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div>
    <!-- HEADER -->
    <div class="flex items-center justify-between gap-4 mb-8">
      <h1 class="text-4xl">Products</h1>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 rounded-full bg-brand-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-600 transition-colors shrink-0"
      >
        <Plus class="w-4 h-4" stroke-width="2.4" />
        Add product
      </button>
    </div>

    <!-- SEARCH & FILTER -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-cocoa-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search products..."
          class="w-full rounded-full border border-cream-300 bg-white pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
        />
      </div>

      <div class="relative shrink-0 w-full sm:w-auto">
        <select
          v-model="selectedType"
          class="appearance-none w-full rounded-full border border-cream-300 bg-white pl-4 pr-10 py-2.5 text-sm font-semibold text-cocoa-500 focus:outline-none focus:border-brand-400 cursor-pointer"
        >
          <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <ChevronDown
          class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">Loading products...</div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="text-center text-cocoa-400 py-24 bg-white rounded-2xl border border-dashed border-cream-300"
    >
      No matching products
    </div>

    <!-- TABEL PRODUK -->
    <div
      v-else
      class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="bg-cocoa-900 text-left text-[11px] font-sans font-bold tracking-[0.12em] uppercase text-cream-50"
            >
              <th class="px-5 py-3.5">Photo</th>
              <th class="px-5 py-3.5">Name</th>
              <th class="px-5 py-3.5">Type</th>
              <th class="px-5 py-3.5">Category</th>
              <th class="px-5 py-3.5">Price</th>
              <th class="px-5 py-3.5"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in filteredProducts"
              :key="product.id"
              class="border-t border-cream-200"
            >
              <td class="px-5 py-4">
                <div
                  class="w-14 h-14 rounded-lg bg-cream-100 overflow-hidden flex items-center justify-center"
                >
                  <img
                    v-if="product.image"
                    :src="product.image"
                    :alt="product.name"
                    class="w-full h-full object-cover"
                  />
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 min-w-[160px]">
                  <span class="font-bold text-cocoa-900">{{ product.name }}</span>
                  <span
                    v-if="Number(product.discount) > 0"
                    class="shrink-0 rounded-full bg-brand-100 text-brand-600 px-2 py-0.5 text-xs font-bold"
                  >
                    -{{ Number(product.discount) }}%
                  </span>
                </div>
              </td>
              <td class="px-5 py-4 text-cocoa-400 whitespace-nowrap">
                {{ typeCell(product) }}
              </td>
              <td class="px-5 py-4 text-cocoa-500 whitespace-nowrap">
                {{ categoryCell(product) }}
              </td>
              <td class="px-5 py-4 font-extrabold text-brand-600 whitespace-nowrap">
                {{ priceLabel(product) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    @click="openEditModal(product)"
                    class="p-2 rounded-lg border border-cream-300 text-brand-500 hover:bg-brand-50 transition-colors"
                    :aria-label="`Edit ${product.name}`"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    :disabled="deletingId === product.id"
                    class="p-2 rounded-lg border border-cream-300 text-cocoa-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50"
                    :aria-label="`Delete ${product.name}`"
                    @click="askDelete(product)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD / EDIT PRODUCT MODAL -->
    <ProductFormModal
      :open="isModalOpen"
      :product="editingProduct"
      @close="isModalOpen = false"
      @saved="handleSaved"
    />

    <!-- DELETE CONFIRMATION -->
    <ConfirmDialog
      :open="!!productToDelete"
      title="Delete Product"
      :message="`Are you sure you want to delete the product “${productToDelete?.name}”? This action cannot be undone.`"
      confirm-text="Yes"
      cancel-text="No"
      variant="danger"
      :is-loading="!!deletingId"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <!-- SUCCESS TOAST -->
    <Toast v-model:message="toastMessage" />
  </div>
</template>
