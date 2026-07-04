<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { deleteProduct } from '@/services/product.service'
import { useProductStore } from '@/stores/product.store'
import { useAnalyticsStore } from '@/stores/analytics.store'
import ProductFormModal from '@/components/admin/ProductFormModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'TYPE1', label: 'Type 1' },
  { value: 'TYPE2', label: 'Type 2' },
  { value: 'TYPE3', label: 'Type 3' },
  { value: 'TYPE4', label: 'Type 4' },
]

const errorMessage = ref('')
const deletingId = ref(null)

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
  // refresh cache bersama tanpa mengosongkannya — halaman Menu ikut ter-update
  productStore.refresh().catch(() => {})
  analyticsStore.invalidate() // angka "Active Products" di dashboard ikut segar
}

const fetchProducts = async () => {
  errorMessage.value = ''
  try {
    await productStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat data produk'
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

const typeLabel = (type) => TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type

const priceLabel = (product) => {
  const prices = product.variants?.map((v) => v.price) ?? []
  if (prices.length === 0) return 'Price'

  const min = Math.min(...prices)
  const formatted = `Rp${min.toLocaleString('id-ID')}`

  return prices.length > 1 && Math.max(...prices) !== min ? `Mulai ${formatted}` : formatted
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
    alert(err.response?.data?.message || 'Gagal menghapus produk')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div>
    <!-- HEADER -->
    <h1 class="text-3xl font-extrabold tracking-tight mb-6">Products</h1>

    <!-- SEARCH & FILTER -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search"
          class="w-full rounded-full border border-gray-300 pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>

      <select
        v-model="selectedType"
        class="rounded-full border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-brand-500"
      >
        <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- LIST HEADER -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold">Products ({{ filteredProducts.length }})</h2>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 transition"
      >
        <Plus class="w-4 h-4" />
        Add Product
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-24">Memuat produk...</div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-red-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="text-center text-gray-400 py-24 border border-dashed border-gray-200 rounded-xl"
    >
      Tidak ada produk yang cocok
    </div>

    <!-- PRODUCT LIST -->
    <div v-else class="space-y-4">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="flex items-center gap-4 border border-gray-200 rounded-xl p-4"
      >
        <div class="w-16 h-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="w-full h-full object-cover"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-bold truncate">{{ product.name }}</h3>
            <span class="shrink-0 rounded-full border border-gray-300 px-3 py-0.5 text-xs">
              {{ typeLabel(product.type) }}
            </span>
          </div>
          <p class="text-sm text-gray-500 truncate mt-1">{{ product.description }}</p>
          <p class="text-sm font-semibold mt-1">{{ priceLabel(product) }}</p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            @click="openEditModal(product)"
            class="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            type="button"
            :disabled="deletingId === product.id"
            class="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
            @click="askDelete(product)"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
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
      title="Hapus Produk"
      :message="`Apakah Anda yakin ingin menghapus produk “${productToDelete?.name}”? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Yes"
      cancel-text="No"
      variant="danger"
      :is-loading="!!deletingId"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
