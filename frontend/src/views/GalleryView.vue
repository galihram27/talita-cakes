<script setup>
import { ref, onMounted, onUnmounted, onServerPrefetch, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useGalleryStore } from '@/stores/gallery.store'
import { usePageSeo } from '@/composables/usePageSeo'

const { t } = useI18n()

usePageSeo({
  title: 'Galeri',
  description:
    "Galeri kue custom, cupcakes, brownies, dan hampers buatan Talita's Cake & Cupcakes Depok.",
  path: '/gallery',
})

const galleryStore = useGalleryStore()
const { items: galleryItems, hasMore } = storeToRefs(galleryStore)

const isLoading = ref(!galleryStore.hasLoaded)
const errorMessage = ref('')
const search = ref(galleryStore.search)
const isLoadingMore = ref(false)

let searchDebounceTimer = null

// Gambar dimuat sedikit demi sedikit. Tombol "muat lebih banyak" menambah
// gambar berikutnya ke daftar yang sudah ada, bukan menggantinya.
const loadMore = async () => {
  isLoadingMore.value = true
  try {
    await galleryStore.loadMore()
  } catch (err) {
    errorMessage.value = t('gallery.error')
  } finally {
    isLoadingMore.value = false
  }
}

// Pencarian dikerjakan server. Supaya server tidak dihubungi tiap ketikan,
// permintaan ditunda 0,4 detik dan timer sebelumnya dibatalkan setiap kali
// pengunjung mengetik lagi — jadi yang terkirim hanya setelah berhenti mengetik.
const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(async () => {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await galleryStore.applySearch(search.value)
    } catch (err) {
      errorMessage.value = t('gallery.error')
    } finally {
      isLoading.value = false
    }
  }, 400)
}

const loadGallery = async () => {
  try {
    await galleryStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = t('gallery.error')
  } finally {
    isLoading.value = false
  }
}
onServerPrefetch(loadGallery)
onMounted(loadGallery)

// Ada dua lapis tampilan bertumpuk. selectedItem menandai gambar mana yang
// sedang dibuka di jendela detail, dan isPhotoOpen menandai apakah fotonya
// sedang dibuka lebih besar lagi di atas jendela detail itu.
const selectedItem = ref(null)
const isDownloading = ref(false)

const isPhotoOpen = ref(false)
const openPhoto = () => {
  isPhotoOpen.value = true
}
const closePhoto = () => {
  isPhotoOpen.value = false
}

const openDetail = (item) => {
  selectedItem.value = item
}

const closeDetail = () => {
  selectedItem.value = null
}

// Saat jendela detail terbuka, halaman di belakangnya dikunci supaya tidak
// ikut bergeser saat digulir. Tampilan foto besar juga ditutup setiap kali
// gambar yang dipilih berganti.
watch(selectedItem, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
  isPhotoOpen.value = false
})

// Tombol Escape menutup satu lapis saja: foto besarnya dulu, baru jendela
// detailnya kalau Escape ditekan sekali lagi.
const handleKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (isPhotoOpen.value) closePhoto()
  else if (selectedItem.value) closeDetail()
}
onMounted(() => window.addEventListener('keydown', handleKeydown))

// Wajib dibersihkan saat halaman ditinggalkan: pemantau tombol dilepas, dan
// kunci gulir dilepas supaya halaman berikutnya tidak ikut terkunci.
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

// Mengunduh gambar. Menautkan langsung ke alamat gambar tidak cukup, karena
// browser akan membukanya sebagai halaman baru, bukan menyimpannya. Jadi
// gambarnya diambil dulu sebagai berkas, lalu diunduh dari salinan sementara
// yang tersimpan di browser.
const downloadImage = async (item) => {
  isDownloading.value = true
  try {
    const response = await fetch(item.imageUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    // Membuat tautan tak terlihat, "menekannya" lewat kode, lalu membuangnya.
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = item.title || 'gallery-image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Salinan sementara tadi dihapus supaya tidak menumpuk di memori.
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    // Kalau cara di atas gagal, minimal gambarnya dibuka di tab baru
    // supaya pengunjung masih bisa menyimpannya secara manual.
    window.open(item.imageUrl, '_blank')
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="tc-page max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-[72px]">
    <div class="mb-6">
      <h1 class="font-display text-[clamp(38px,5vw,52px)] leading-[1.05]">
        {{ t('gallery.heading1') }}
        <span class="italic text-brand-500">{{ t('gallery.heading2') }}</span>
      </h1>
      <p class="mt-3 text-[15px] leading-relaxed text-[#6E5A4D] max-w-[860px]">
        {{ t('gallery.subtitle') }}
      </p>
    </div>

    <div class="relative max-w-[560px] mb-8">
      <span
        class="absolute left-4 top-1/2 -translate-y-1/2 flex text-cocoa-400 pointer-events-none"
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
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
        </svg>
      </span>
      <input
        v-model="search"
        @input="handleSearchInput"
        type="text"
        :placeholder="t('gallery.searchPlaceholder')"
        class="w-full rounded-full border border-[#E4D3C1] bg-white py-3 pl-11 pr-4 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E] focus:border-brand-500"
      />
    </div>

    <p v-if="errorMessage" class="text-brand-600 text-sm mb-8">{{ errorMessage }}</p>

    <div v-if="isLoading" class="text-center text-cocoa-400 py-20">{{ t('gallery.loading') }}</div>

    <div v-else-if="galleryItems.length === 0" class="py-12 text-cocoa-400 text-[15px]">
      {{ t('gallery.empty') }}
    </div>

    <template v-else>
      <!-- Tiap gambar dibungkus <button>, bukan <div>, karena memang bisa
           ditekan untuk membuka detail — dengan begitu bisa diakses lewat
           tombol Tab dan Enter juga, bukan hanya lewat klik mouse. -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <button
          v-for="item in galleryItems"
          :key="item.id"
          type="button"
          @click="openDetail(item)"
          class="group relative aspect-square rounded-2xl border border-cream-300 overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)] transition-all hover:shadow-[0_16px_32px_-16px_rgba(88,46,35,0.3)] hover:-translate-y-0.5"
        >
          <img
            :src="item.imageUrl"
            :alt="item.title"
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </button>
      </div>

      <div v-if="hasMore" class="flex justify-center mt-12">
        <button
          type="button"
          :disabled="isLoadingMore"
          @click="loadMore"
          class="rounded-full bg-brand-500 text-white px-6 py-3 text-sm font-extrabold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoadingMore ? t('gallery.loadingMore') : t('gallery.loadMore') }}
        </button>
      </div>
    </template>

    <!-- Teleport memindahkan jendela ini ke luar, langsung di bawah <body>,
         supaya tidak terhalang atau terpotong oleh pengaturan tata letak
         halaman. @click.self membuat jendela hanya tertutup kalau yang diklik
         area gelap di sekelilingnya, bukan isi jendelanya. -->
    <Teleport to="body">
      <Transition name="tc-modal">
        <div
          v-if="selectedItem"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-cocoa-900/60 backdrop-blur-sm"
          @click.self="closeDetail"
        >
          <div
            class="tc-modal-panel relative m-auto grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] w-full max-w-2xl max-h-[85vh] overflow-hidden bg-cream-50 rounded-[22px] shadow-[0_30px_80px_-20px_rgba(51,38,31,0.6)]"
          >
            <button
              type="button"
              @click="closeDetail"
              class="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-white/85 backdrop-blur text-cocoa-900 flex items-center justify-center text-sm shadow-sm hover:bg-brand-500 hover:text-white transition-colors"
              :aria-label="t('common.close')"
            >
              ✕
            </button>

            <button
              type="button"
              @click="openPhoto"
              class="group relative flex items-center justify-center min-h-[200px] max-h-[38vh] md:max-h-[85vh] overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)] cursor-zoom-in"
            >
              <img
                :src="selectedItem.imageUrl"
                :alt="selectedItem.title"
                class="w-full h-full object-contain select-none"
              />
              <span
                class="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur text-cocoa-900 flex items-center justify-center shadow-sm group-hover:bg-brand-500 group-hover:text-white transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </span>
            </button>

            <div class="flex flex-col p-5 md:p-6 overflow-y-auto">
              <span
                class="text-[11px] font-extrabold tracking-[0.14em] uppercase text-cocoa-400 mb-2"
              >
                {{ t('nav.gallery') }}
              </span>
              <h2 class="font-display text-[26px] leading-tight text-cocoa-900 mb-3">
                {{ selectedItem.title }}
              </h2>

              <div v-if="selectedItem.tags?.length" class="flex flex-wrap gap-2 mb-4">
                <span
                  v-for="tag in selectedItem.tags"
                  :key="tag"
                  class="rounded-full bg-brand-100 text-brand-500 px-3 py-1 text-xs font-bold"
                >
                  {{ tag }}
                </span>
              </div>

              <p
                v-if="selectedItem.description"
                class="text-[14.5px] text-[#6E5A4D] leading-[1.75]"
              >
                {{ selectedItem.description }}
              </p>

              <!-- mt-auto mendorong tombol unduh ke dasar jendela, jadi
                   posisinya tetap di bawah walau keterangannya pendek. -->
              <button
                type="button"
                :disabled="isDownloading"
                @click="downloadImage(selectedItem)"
                class="mt-auto pt-6 shrink-0"
              >
                <span
                  class="flex items-center justify-center gap-2 w-full rounded-full bg-brand-500 text-white py-3.5 text-sm font-extrabold shadow-[0_12px_26px_-12px_rgba(169,46,48,0.65)] hover:bg-brand-600 hover:-translate-y-px transition-all"
                  :class="isDownloading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {{ isDownloading ? t('gallery.downloading') : t('gallery.download') }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Lapis kedua: foto ukuran penuh. z-index-nya 110, lebih tinggi dari
         jendela detail (100), supaya tampil menutupi jendela tersebut.
         @click.stop pada gambarnya mencegah klik pada foto ikut menutup
         jendela, karena klik di area gelap memang berfungsi untuk menutup. -->
    <Teleport to="body">
      <Transition name="tc-modal">
        <div
          v-if="isPhotoOpen && selectedItem"
          class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8 bg-cocoa-900/90"
          @click="closePhoto"
        >
          <button
            type="button"
            @click.stop="closePhoto"
            class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-brand-500 transition-colors"
            :aria-label="t('common.close')"
          >
            ✕
          </button>
          <img
            :src="selectedItem.imageUrl"
            :alt="selectedItem.title"
            @click.stop
            class="tc-modal-panel max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tc-modal-enter-active,
.tc-modal-leave-active {
  transition: opacity 0.22s ease;
}
.tc-modal-enter-from,
.tc-modal-leave-to {
  opacity: 0;
}
.tc-modal-enter-active .tc-modal-panel,
.tc-modal-leave-active .tc-modal-panel {
  transition: transform 0.22s ease;
}
.tc-modal-enter-from .tc-modal-panel,
.tc-modal-leave-to .tc-modal-panel {
  transform: translateY(12px) scale(0.98);
}
</style>
