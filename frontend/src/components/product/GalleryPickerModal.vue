<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import { getGalleries } from '@/services/gallery.service'

const props = defineProps({
  modelValue: { type: Boolean, default: false }, // isOpen
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
  }
)

// Prefetch gallery saat komponen mount supaya begitu modal dibuka gambarnya
// langsung tampil tanpa loading.
onMounted(fetchGalleries)

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
        <h2 class="text-lg font-bold">{{ t('gallery.picker.title') }}</h2>
        <button type="button" @click="close" class="text-sm text-gray-500 hover:text-gray-900">✕</button>
      </div>

      <!-- SEARCH -->
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