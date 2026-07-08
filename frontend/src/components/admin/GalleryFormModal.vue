<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { X, Upload } from 'lucide-vue-next'
import { createGallery, updateGallery } from '@/services/gallery.service'
import { uploadImage } from '@/services/upload.service'

const props = defineProps({
  open: { type: Boolean, default: false },
  // null = mode "Add", object gallery = mode "Edit"
  item: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const isEdit = computed(() => !!props.item)

const modalTitle = computed(() =>
  isEdit.value ? `Edit: ${props.item.title}` : 'Add Image'
)

// ===== STATE FORM =====
const form = reactive({
  title: '',
  imageUrl: '',
  description: '',
  tags: '', // input dipisah koma, backend menerima string "a,b,c"
})

const fileInputRef = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')

// ===== RESET / PREFILL saat modal dibuka =====
const resetForm = () => {
  errorMessage.value = ''
  isSubmitting.value = false

  const g = props.item
  Object.assign(form, {
    title: g?.title ?? '',
    imageUrl: g?.imageUrl ?? '',
    description: g?.description ?? '',
    tags: Array.isArray(g?.tags) ? g.tags.join(', ') : (g?.tags ?? ''),
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true }
)

// ===== IMAGE UPLOAD (ke Cloudinary via /uploads/images) =====
// Simpan URL Cloudinary, BUKAN base64 — base64 membengkakkan DB & bikin
// fetch gallery lambat (1 gambar bisa bermega-mega byte).
const isUploading = ref(false)

const openFilePicker = () => fileInputRef.value?.click()

const handleFileChange = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  isUploading.value = true
  errorMessage.value = ''
  try {
    const { url } = await uploadImage(file)
    form.imageUrl = url
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Failed to upload image. Please try again.'
  } finally {
    isUploading.value = false
  }
}

const removeImage = () => {
  form.imageUrl = ''
}

// ===== SUBMIT =====
const validate = () => {
  if (!form.title.trim()) return 'Title is required'
  if (!form.imageUrl) return 'Image is required'
  return null
}

const buildPayload = () => ({
  title: form.title.trim(),
  imageUrl: form.imageUrl,
  description: form.description.trim(),
  tags: form.tags,
})

const handleSubmit = async () => {
  errorMessage.value = ''
  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isSubmitting.value = true
  try {
    if (!isEdit.value) {
      await createGallery(buildPayload())
    } else {
      await updateGallery(props.item.id, buildPayload())
    }
    emit('saved')
    emit('close')
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Failed to save image. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

const close = () => {
  if (isSubmitting.value) return
  emit('close')
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto"
  >
    <div class="bg-white rounded-2xl w-full max-w-md shadow-[0_10px_40px_-12px_rgba(51,38,31,0.35)]">
      <!-- HEADER -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-cream-200">
        <h2 class="text-xl text-cocoa-900 truncate">{{ modalTitle }}</h2>
        <button
          type="button"
          @click="close"
          class="p-1 text-cocoa-400 hover:text-cocoa-900 transition"
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- BODY -->
      <form class="px-6 py-5 space-y-5" @submit.prevent="handleSubmit">
        <!-- TITLE -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">Title</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Image Title..."
            class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>

        <!-- IMAGE -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">Image</label>
          <button
            type="button"
            @click="openFilePicker"
            :disabled="isUploading"
            class="inline-flex items-center gap-2 rounded-full border border-cream-300 px-5 py-2 text-sm font-semibold text-cocoa-500 hover:bg-cream-50 hover:border-brand-400 transition disabled:opacity-50"
          >
            <Upload class="w-4 h-4" />
            {{ isUploading ? 'Uploading...' : 'Upload Image' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />

          <div v-if="form.imageUrl" class="flex items-center gap-3 mt-3">
            <div class="w-16 h-16 rounded-lg border border-cream-300 overflow-hidden bg-cream-100">
              <img :src="form.imageUrl" alt="Preview" class="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              @click="removeImage"
              class="w-8 h-8 rounded-full border border-cream-300 text-cocoa-500 flex items-center justify-center hover:border-brand-400 hover:text-brand-600 transition"
              aria-label="Remove image"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- DESCRIPTION -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
            Description <span class="text-cocoa-400 font-normal">(optional)</span>
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-2xl border border-cream-300 px-4 py-3 text-sm focus:outline-none resize-none"
          ></textarea>
        </div>

        <!-- TAGS -->
        <div>
          <label class="block text-sm font-semibold text-cocoa-900 mb-1.5">
            Tags <span class="text-cocoa-400 font-normal">(optional, separate with commas)</span>
          </label>
          <input
            v-model="form.tags"
            type="text"
            placeholder="birthday, wedding, custom..."
            class="w-full rounded-full border border-cream-300 px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>

        <!-- ERROR -->
        <p v-if="errorMessage" class="text-sm text-brand-600">{{ errorMessage }}</p>

        <!-- ACTIONS -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="close"
            :disabled="isSubmitting"
            class="rounded-full border border-cream-300 px-5 py-2.5 text-sm font-semibold text-cocoa-500 hover:bg-cream-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || isUploading"
            class="rounded-full bg-brand-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-brand-600 transition disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Image' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
