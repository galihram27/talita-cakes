<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GalleryPickerModal from './GalleryPickerModal.vue'
import { uploadImage } from '@/services/upload.service'

defineProps({
  modelValue: { type: Object, default: null }, // { url, source: 'upload' | 'gallery' }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

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
      err.response?.data?.message || t('product.designRef.uploadFailed')
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
  <div class="mb-6">
    <p class="text-[15px] font-extrabold mb-1">
      {{ t('product.designRef.title') }}
      <span class="text-cocoa-400 font-bold text-[13px]">{{ t('product.designRef.optional') }}</span>
    </p>
    <p class="text-[13px] text-cocoa-400 mb-2.5">
      {{ t('product.designRef.desc') }}
    </p>

    <!-- pilihan sumber (belum ada referensi) -->
    <div v-if="!modelValue" class="flex flex-wrap gap-2.5">
      <button
        type="button"
        @click="openFilePicker"
        :disabled="isUploading"
        class="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-[#D9C4AE] bg-white px-5 py-3 text-sm font-bold text-[#6E5A4D] hover:border-brand-500 hover:text-brand-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {{ isUploading ? t('product.designRef.uploading') : t('product.designRef.upload') }}
      </button>
      <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileChange" />

      <button
        type="button"
        @click="isGalleryModalOpen = true"
        class="inline-flex items-center gap-2 rounded-xl border-2 border-[#EBDCCC] bg-white px-5 py-3 text-sm font-bold text-[#6E5A4D] hover:border-brand-500 hover:text-brand-500 transition-colors"
      >
        {{ t('product.designRef.chooseFromGallery') }}
      </button>
    </div>

    <p v-if="uploadError" class="text-sm text-brand-600 mt-2">{{ uploadError }}</p>

    <!-- preview referensi terpilih -->
    <div
      v-if="modelValue"
      class="flex items-center gap-3.5 border border-cream-300 bg-white rounded-xl px-3.5 py-3"
    >
      <span
        class="relative w-14 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
      >
        <img
          :src="modelValue.url"
          :alt="t('product.designRef.title')"
          class="absolute inset-0 w-full h-full object-cover"
        />
      </span>
      <span class="flex-1 min-w-0">
        <span class="block font-extrabold text-sm">{{ t('product.designRef.title') }}</span>
        <span class="block text-[12.5px] text-cocoa-400">
          {{ modelValue.source === 'gallery' ? t('product.designRef.fromGallery') : t('product.designRef.ownUpload') }}
        </span>
      </span>
      <button
        type="button"
        @click="remove"
        class="bg-brand-100 text-brand-500 font-extrabold text-[13px] px-3.5 py-2 rounded-full hover:bg-[#F1D6CF] transition-colors"
      >
        {{ t('product.designRef.change') }}
      </button>
    </div>

    <GalleryPickerModal v-model="isGalleryModalOpen" @select="handleGallerySelect" />
  </div>
</template>
