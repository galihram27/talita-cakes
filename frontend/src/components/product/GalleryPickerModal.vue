<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { Search } from 'lucide-vue-next'
import { getGalleries } from '@/services/gallery.service'

const props = defineProps({
  modelValue: { type: Boolean, default: false }, // isOpen
})

const emit = defineEmits(['update:modelValue', 'select'])

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
    error.value = 'Gagal memuat gallery'
  } finally {
    isLoading.value = false
  }
}

const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(fetchGalleries, 400)
}

// Kunci scroll background selama modal terbuka supaya halaman di belakang
// overlay tidak ikut ter-scroll.
const lockBodyScroll = (lock) => {
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(
  () => props.modelValue,
  (isOpen) => {
    lockBodyScroll(isOpen)
    if (isOpen) {
      searchQuery.value = ''
      fetchGalleries()
    }
  }
)

onUnmounted(() => {
  clearTimeout(searchDebounceTimer)
  // pastikan scroll tidak tetap terkunci kalau komponen di-unmount saat terbuka
  lockBodyScroll(false)
})

const close = () => emit('update:modelValue', false)
const choose = (item) => {
  emit('select', item)
  close()
}
</script>

<template>
  <!-- Teleport ke body: kalau ada leluhur yang punya transform/filter, elemen
       fixed jadi relatif ke leluhur itu (tidak ke tengah layar). Dipindah ke
       body supaya overlay selalu menutupi & terpusat di viewport. -->
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
      @click.self="close"
    >
    <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">Choose from Gallery</h2>
        <button type="button" @click="close" class="text-sm text-gray-500 hover:text-gray-900">✕</button>
      </div>

      <!-- SEARCH -->
      <div class="relative mb-4">
        <Search class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          @input="handleSearchInput"
          type="text"
          placeholder="Cari desain..."
          class="w-full rounded-full border border-gray-300 pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>

      <div v-if="isLoading" class="text-center py-10 text-gray-500 text-sm">Memuat gallery...</div>
      <div v-else-if="error" class="text-center py-10 text-red-600 text-sm">{{ error }}</div>
      <div v-else-if="galleryItems.length === 0" class="text-center py-10 text-gray-500 text-sm">
        {{ searchQuery ? `Tidak ada hasil untuk '${searchQuery}'` : 'Belum ada gambar di gallery.' }}
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