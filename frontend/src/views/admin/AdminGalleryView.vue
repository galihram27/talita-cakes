<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { deleteGallery } from '@/services/gallery.service'
import { useGalleryStore } from '@/stores/gallery.store'
import { useAdminGalleryStore } from '@/stores/adminGallery.store'
import { useAnalyticsStore } from '@/stores/analytics.store'
import GalleryFormModal from '@/components/admin/GalleryFormModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

// Data gallery diambil dari cache store admin (stale-while-revalidate):
// kunjungan kedua langsung tampil tanpa loading, refresh jalan di background.
const adminGalleryStore = useAdminGalleryStore()
const analyticsStore = useAnalyticsStore()

const errorMessage = ref('')
const searchQuery = ref(adminGalleryStore.search)
const isLoadingMore = ref(false)

const galleryItems = computed(() => adminGalleryStore.items)
const totalItems = computed(() => adminGalleryStore.totalItems)
// Loading hanya saat cache belum pernah terisi sama sekali
const isLoading = computed(() => !adminGalleryStore.hasLoaded && !errorMessage.value)

let searchDebounceTimer = null

onMounted(async () => {
  try {
    await adminGalleryStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat gallery'
  }
})

const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(async () => {
    try {
      errorMessage.value = ''
      await adminGalleryStore.applySearch(searchQuery.value)
    } catch (err) {
      errorMessage.value = err.response?.data?.message || 'Gagal memuat gallery'
    }
  }, 400)
}

const loadMore = async () => {
  isLoadingMore.value = true
  try {
    await adminGalleryStore.loadMore()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat gallery'
  } finally {
    isLoadingMore.value = false
  }
}

// ===== MODAL ADD / EDIT =====
const isModalOpen = ref(false)
const editingItem = ref(null) // null = mode "Add"

const openAddModal = () => {
  editingItem.value = null
  isModalOpen.value = true
}

const openEditModal = (item) => {
  editingItem.value = item
  isModalOpen.value = true
}

const publicGalleryStore = useGalleryStore()

const handleSaved = () => {
  publicGalleryStore.invalidate() // supaya halaman Gallery publik tidak menampilkan cache basi
  analyticsStore.invalidate() // angka "Gallery Images" di dashboard ikut segar
  adminGalleryStore.refresh().catch(() => {})
}

// ===== DELETE =====
const deletingItem = ref(null) // item yang dikonfirmasi untuk dihapus
const isDeleting = ref(false)
const deleteError = ref('')

const openDeleteConfirm = (item) => {
  deleteError.value = ''
  deletingItem.value = item
}

const handleDelete = async () => {
  if (!deletingItem.value) return

  isDeleting.value = true
  try {
    await deleteGallery(deletingItem.value.id)
    publicGalleryStore.invalidate() // supaya halaman Gallery publik tidak menampilkan cache basi
    analyticsStore.invalidate()
    // hapus langsung dari cache supaya UI update seketika, lalu sinkronkan
    adminGalleryStore.items = adminGalleryStore.items.filter(
      (i) => i.id !== deletingItem.value.id
    )
    adminGalleryStore.refresh().catch(() => {})
  } catch (err) {
    deleteError.value = err.response?.data?.message || 'Gagal menghapus gambar'
  } finally {
    deletingItem.value = null
    isDeleting.value = false
  }
}
</script>

<template>
  <div>
    <!-- HEADER -->
    <h1 class="text-3xl font-extrabold tracking-tight mb-6">Gallery</h1>

    <!-- SEARCH -->
    <div class="relative mb-6 max-w-md">
      <Search class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        v-model="searchQuery"
        @input="handleSearchInput"
        type="text"
        placeholder="Search"
        class="w-full rounded-full border border-gray-300 pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
      />
    </div>

    <!-- LIST HEADER -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold">Images ({{ totalItems }})</h2>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 transition"
      >
        <Plus class="w-4 h-4" />
        Add Image
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-24">Memuat gallery...</div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-red-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="galleryItems.length === 0"
      class="text-center text-gray-400 py-24 border border-dashed border-gray-200 rounded-xl"
    >
      Belum ada gambar di gallery
    </div>

    <!-- GRID -->
    <template v-else>
      <p v-if="deleteError" class="text-sm text-red-600 mb-4">{{ deleteError }}</p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="item in galleryItems"
          :key="item.id"
          class="relative aspect-square rounded-lg border border-gray-300 bg-gray-200 overflow-hidden group"
        >
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.title"
            class="w-full h-full object-cover"
          />

          <!-- EDIT & DELETE (pojok kanan atas) -->
          <div class="absolute top-2 right-2 flex items-center gap-1.5">
            <button
              type="button"
              @click="openEditModal(item)"
              class="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:text-brand-600 hover:bg-white transition"
              :aria-label="`Edit ${item.title}`"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              type="button"
              @click="openDeleteConfirm(item)"
              class="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-white transition"
              :aria-label="`Hapus ${item.title}`"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- LOAD MORE -->
      <div v-if="adminGalleryStore.hasMore" class="flex justify-center mt-8">
        <button
          type="button"
          :disabled="isLoadingMore"
          @click="loadMore"
          class="rounded-full border border-brand-600 text-brand-600 px-6 py-2.5 text-sm font-semibold hover:bg-brand-600 hover:text-white transition disabled:opacity-50"
        >
          {{ isLoadingMore ? 'Memuat...' : 'Load More' }}
        </button>
      </div>
    </template>

    <!-- MODAL ADD / EDIT -->
    <GalleryFormModal
      :open="isModalOpen"
      :item="editingItem"
      @close="isModalOpen = false"
      @saved="handleSaved"
    />

    <!-- KONFIRMASI HAPUS -->
    <ConfirmDialog
      :open="!!deletingItem"
      title="Hapus Gambar"
      :message="`Yakin ingin menghapus '${deletingItem?.title}' dari gallery? Tindakan ini tidak bisa dibatalkan.`"
      confirm-text="Hapus"
      cancel-text="Batal"
      :is-loading="isDeleting"
      @confirm="handleDelete"
      @cancel="deletingItem = null"
    />
  </div>
</template>
