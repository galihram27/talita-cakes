<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGalleryStore } from '@/stores/gallery.store'

// ===== STATE: LIST =====
// List (termasuk posisi search & pagination) disimpan di store supaya balik
// ke halaman ini langsung tampil dari cache tanpa loading.
const galleryStore = useGalleryStore()
const { items: galleryItems, hasMore } = storeToRefs(galleryStore)

const isLoading = ref(!galleryStore.hasLoaded)
const errorMessage = ref('')
const search = ref(galleryStore.search)
const isLoadingMore = ref(false)

let searchDebounceTimer = null

const loadMore = async () => {
  isLoadingMore.value = true
  try {
    await galleryStore.loadMore()
  } catch (err) {
    errorMessage.value = 'Gagal memuat gallery, silakan coba lagi.'
  } finally {
    isLoadingMore.value = false
  }
}

// search: debounce 400ms, selalu reset ke page 1
const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(async () => {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await galleryStore.applySearch(search.value)
    } catch (err) {
      errorMessage.value = 'Gagal memuat gallery, silakan coba lagi.'
    } finally {
      isLoading.value = false
    }
  }, 400)
}

onMounted(async () => {
  try {
    await galleryStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = 'Gagal memuat gallery, silakan coba lagi.'
  } finally {
    isLoading.value = false
  }
})

// ===== STATE: DETAIL MODAL =====
const selectedItem = ref(null)
const isDownloading = ref(false)

const openDetail = (item) => {
  selectedItem.value = item
}

const closeDetail = () => {
  selectedItem.value = null
}

// Download via blob supaya tetap ke-trigger "save file" walau gambar
// disimpan di storage/CDN eksternal (cross-origin).
const downloadImage = async (item) => {
  isDownloading.value = true
  try {
    const response = await fetch(item.imageUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = objectUrl
    link.download = item.title || 'gallery-image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    // fallback kalau fetch diblok CORS: buka di tab baru, user save manual
    window.open(item.imageUrl, '_blank')
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-12">
    <!-- HEADLINE -->
    <div class="text-center mb-10">
      <h1 class="text-4xl font-extrabold mb-3">Gallery</h1>
      <p class="text-gray-600 max-w-xl mx-auto">
        Kumpulan karya kue kami untuk berbagai momen spesial.
        Temukan inspirasi untuk pesananmu!
      </p>
    </div>

    <!-- SEARCH -->
    <div class="flex justify-center mb-12">
      <div class="relative w-full max-w-md">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1110.5 4a6.5 6.5 0 016.5 6.5z" />
        </svg>
        <input
          v-model="search"
          @input="handleSearchInput"
          type="text"
          placeholder="Cari inspirasi kue..."
          class="w-full rounded-full border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
    </div>

    <!-- ERROR -->
    <p v-if="errorMessage" class="text-center text-red-600 text-sm mb-8">{{ errorMessage }}</p>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-20">Memuat gallery...</div>

    <!-- EMPTY -->
    <div v-else-if="galleryItems.length === 0" class="text-center text-gray-500 py-20">
      Belum ada gambar di gallery.
    </div>

    <!-- GRID -->
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <button
          v-for="item in galleryItems"
          :key="item.id"
          type="button"
          @click="openDetail(item)"
          class="group aspect-[3/4] rounded-lg border border-gray-300 overflow-hidden bg-gray-200"
        >
          <img
            :src="item.imageUrl"
            :alt="item.title"
            class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </button>
      </div>

      <!-- LOAD MORE -->
      <div v-if="hasMore" class="flex justify-center mt-12">
        <button
          type="button"
          :disabled="isLoadingMore"
          @click="loadMore"
          class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold hover:bg-brand-600 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoadingMore ? 'Memuat...' : 'Load More' }}
        </button>
      </div>
    </template>

    <!-- ===== DETAIL MODAL ===== -->
    <div
      v-if="selectedItem"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
      @click.self="closeDetail"
    >
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <!-- IMAGE -->
        <div class="relative aspect-[4/3] bg-gray-200">
          <button
            type="button"
            @click="closeDetail"
            class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 border border-gray-300 flex items-center justify-center text-sm hover:bg-white transition"
            aria-label="Tutup"
          >
            ✕
          </button>
          <img
            :src="selectedItem.imageUrl"
            :alt="selectedItem.title"
            class="w-full h-full object-cover"
          />
        </div>

        <!-- INFO -->
        <div class="p-6">
          <h2 class="text-2xl font-extrabold mb-2">{{ selectedItem.title }}</h2>

          <div v-if="selectedItem.tags?.length" class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="tag in selectedItem.tags"
              :key="tag"
              class="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600"
            >
              {{ tag }}
            </span>
          </div>

          <p v-if="selectedItem.description" class="text-sm text-gray-600 leading-relaxed mb-6">
            {{ selectedItem.description }}
          </p>

          <button
            type="button"
            :disabled="isDownloading"
            @click="downloadImage(selectedItem)"
            class="w-full rounded-full border border-brand-600 bg-brand-600 text-white py-3 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDownloading ? 'Downloading...' : '⬇ Download Image' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>