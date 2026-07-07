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
  <div class="tc-page max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-[72px]">
    <!-- HEADLINE -->
    <div class="mb-6">
      <h1 class="font-display text-[clamp(38px,5vw,52px)] leading-[1.05]">
        Cake Inspiration <span class="italic text-brand-500">Gallery</span>
      </h1>
      <p class="mt-3 text-[15px] leading-relaxed text-[#6E5A4D] max-w-[860px]">
        Browse hundreds of handcrafted cakes we've created since 2012. Find
        inspiration for your celebration, save your favorite design, or
        customize it to create a cake that's uniquely yours.
      </p>
    </div>

    <!-- SEARCH -->
    <div class="relative max-w-[560px] mb-8">
      <span
        class="absolute left-4 top-1/2 -translate-y-1/2 flex text-cocoa-400 pointer-events-none"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
      </span>
      <input
        v-model="search"
        @input="handleSearchInput"
        type="text"
        placeholder="Tip: You can search by theme, character, color, occasion, or flavor"
        class="w-full rounded-full border border-[#E4D3C1] bg-white py-3 pl-11 pr-4 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E] focus:border-brand-500"
      />
    </div>

    <!-- ERROR -->
    <p v-if="errorMessage" class="text-brand-600 text-sm mb-8">{{ errorMessage }}</p>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-20">Memuat gallery...</div>

    <!-- EMPTY -->
    <div v-else-if="galleryItems.length === 0" class="py-12 text-cocoa-400 text-[15px]">
      Belum ada gambar di gallery.
    </div>

    <!-- GRID -->
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <button
          v-for="item in galleryItems"
          :key="item.id"
          type="button"
          @click="openDetail(item)"
          class="group relative aspect-[3/4] rounded-2xl border border-cream-300 overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)] transition-all hover:shadow-[0_16px_32px_-16px_rgba(88,46,35,0.3)] hover:-translate-y-0.5"
        >
          <img
            :src="item.imageUrl"
            :alt="item.title"
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </button>
      </div>

      <!-- LOAD MORE -->
      <div v-if="hasMore" class="flex justify-center mt-12">
        <button
          type="button"
          :disabled="isLoadingMore"
          @click="loadMore"
          class="rounded-full bg-brand-500 text-white px-6 py-3 text-sm font-extrabold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoadingMore ? 'Memuat...' : 'Load More' }}
        </button>
      </div>
    </template>

    <!-- ===== DETAIL MODAL ===== -->
    <div
      v-if="selectedItem"
      class="fixed inset-0 bg-cocoa-900/55 flex items-center justify-center z-[100] px-6"
      @click.self="closeDetail"
    >
      <div class="bg-cream-50 rounded-[20px] w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <!-- IMAGE -->
        <div class="relative aspect-[4/3] bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)]">
          <button
            type="button"
            @click="closeDetail"
            class="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#F0E3D6] text-[#6E5A4D] flex items-center justify-center text-sm hover:bg-brand-500 hover:text-white transition-colors"
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
          <h2 class="font-display text-2xl mb-2">{{ selectedItem.title }}</h2>

          <div v-if="selectedItem.tags?.length" class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="tag in selectedItem.tags"
              :key="tag"
              class="rounded-full bg-brand-100 text-brand-500 px-3 py-1 text-xs font-bold"
            >
              {{ tag }}
            </span>
          </div>

          <p v-if="selectedItem.description" class="text-sm text-[#6E5A4D] leading-relaxed mb-6">
            {{ selectedItem.description }}
          </p>

          <button
            type="button"
            :disabled="isDownloading"
            @click="downloadImage(selectedItem)"
            class="w-full rounded-full bg-gradient-to-br from-[#C6423F] to-[#A82E30] text-white py-3 text-sm font-extrabold shadow-[0_12px_26px_-12px_rgba(169,46,48,0.65)] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDownloading ? 'Downloading...' : '⬇ Download Image' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>