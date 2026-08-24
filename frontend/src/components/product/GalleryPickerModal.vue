<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import { getGalleries } from '@/services/gallery.service'

/**
 * Modal untuk memilih foto dari galeri toko, dipakai pembeli saat menentukan
 * acuan desain kue. Foto yang dipilih dikabarkan lewat event `select`.
 */
const props = defineProps({
  // Dipakai lewat v-model: true berarti modal terbuka
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'select'])
const { t } = useI18n()

const galleryItems = ref([])
const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')

let searchDebounceTimer = null

const fetchGalleries = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const result = await getGalleries({
      search: searchQuery.value || undefined,
      limit: 12,
    })
    galleryItems.value = result.data
  } catch (err) {
    error.value = t('gallery.picker.loadFailed')
  } finally {
    isLoading.value = false
  }
}

// Tunggu 400 milidetik sejak ketikan terakhir baru mencari. Tanpa jeda ini
// setiap huruf yang diketik memicu satu permintaan ke server.
const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(fetchGalleries, 400)
}

// Halaman di belakang modal dibuat tidak bisa digulir selama modal terbuka
const lockBodyScroll = (lock) => {
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(
  () => props.modelValue,
  (isOpen) => {
    lockBodyScroll(isOpen)
  }
)

// Foto diambil lebih dulu saat halaman dimuat, bukan saat modal dibuka,
// supaya begitu diklik isinya sudah siap tanpa jeda memuat
onMounted(fetchGalleries)

onUnmounted(() => {
  clearTimeout(searchDebounceTimer)
  // Buka kuncinya, kalau tidak halaman berikutnya ikut tidak bisa digulir
  lockBodyScroll(false)
})

const close = () => emit('update:modelValue', false)
const choose = (item) => {
  emit('select', item)
  close()
}
</script>

<template>
  <!-- Dipindahkan ke <body> supaya latar gelapnya benar-benar menutupi layar.
       Kalau dibiarkan di tempat asalnya, ia bisa terkurung pembungkus halaman
       yang beranimasi dan malah muncul tidak di tengah. -->
  <Teleport to="body">
    <!-- click.self: hanya klik pada latar gelapnya yang menutup modal,
         klik di dalam kotak putih tidak -->
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
      @click.self="close"
    >
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">{{ t('gallery.picker.title') }}</h2>
          <button type="button" @click="close" class="text-sm text-gray-500 hover:text-gray-900">✕</button>
        </div>

        <!-- Kolom pencarian; pencariannya sendiri ditunda sesaat (lihat script) -->
        <div class="relative mb-4">
          <Search class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            @input="handleSearchInput"
            type="text"
            :placeholder="t('gallery.picker.searchPlaceholder')"
            class="w-full rounded-full border border-gray-300 pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <!-- Tiga keadaan: gagal memuat, tidak ada hasil, atau daftar foto -->
        <div v-if="error" class="text-center py-10 text-red-600 text-sm">{{ error }}</div>
        <div v-else-if="!isLoading && galleryItems.length === 0" class="text-center py-10 text-gray-500 text-sm">
          {{ searchQuery ? t('gallery.picker.noResults', { query: searchQuery }) : t('gallery.empty') }}
        </div>
        <div v-else class="grid grid-cols-3 gap-3">
          <button
            v-for="item in galleryItems"
            :key="item.id"
            type="button"
            @click="choose(item)"
            class="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-brand-400 transition"
          >
            <img :src="item.imageUrl" :alt="item.title" class="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
