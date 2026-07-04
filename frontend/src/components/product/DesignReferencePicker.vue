<script setup>
import { ref } from 'vue'
import GalleryPickerModal from './GalleryPickerModal.vue'
import { uploadImage } from '@/services/upload.service'

defineProps({
  modelValue: { type: Object, default: null }, // { url, source: 'upload' | 'gallery' }
})

const emit = defineEmits(['update:modelValue'])

const fileInputRef = ref(null)
const isGalleryModalOpen = ref(false)
const isUploading = ref(false)
const uploadError = ref('')

const openFilePicker = () => fileInputRef.value?.click()

const handleFileChange = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  uploadError.value = ''
  isUploading.value = true
  try {
    const { url } = await uploadImage(file)
    emit('update:modelValue', { url, source: 'upload' })
  } catch (err) {
    uploadError.value =
      err.response?.data?.message || 'Gagal meng-upload gambar. Coba lagi.'
  } finally {
    isUploading.value = false
  }
}

const handleGallerySelect = (item) => {
  emit('update:modelValue', { url: item.imageUrl, source: 'gallery' })
}

const remove = () => emit('update:modelValue', null)
</script>

<template>
  <div class="mb-8">
    <p class="text-sm font-semibold mb-2">Design Reference</p>
    <div class="flex flex-wrap gap-3 mb-4">
      <button
        type="button"
        @click="openFilePicker"
        :disabled="isUploading"
        class="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium hover:border-gray-500 transition disabled:opacity-50 disabled:cursor-wait"
      >
        {{ isUploading ? '⏳ Uploading...' : '⬆ Upload Image' }}
      </button>
      <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileChange" />

      <button
        type="button"
        @click="isGalleryModalOpen = true"
        class="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium hover:border-gray-500 transition"
      >
        🖼 Choose from Gallery
      </button>
    </div>

    <p v-if="uploadError" class="text-sm text-red-500 mb-3">{{ uploadError }}</p>

    <div v-if="modelValue" class="flex items-center gap-3">
      <div class="w-24 h-24 rounded-xl border border-gray-300 bg-gray-200 overflow-hidden">
        <img :src="modelValue.url" alt="Design reference" class="w-full h-full object-cover" />
      </div>
      <button
        type="button"
        @click="remove"
        class="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-sm hover:border-gray-500 transition"
        aria-label="Hapus gambar referensi"
      >
        ✕
      </button>
    </div>

    <GalleryPickerModal v-model="isGalleryModalOpen" @select="handleGallerySelect" />
  </div>
</template>