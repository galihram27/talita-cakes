<script setup>
import { AlertTriangle } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Confirmation' },
  message: { type: String, default: 'Are you sure?' },
  confirmText: { type: String, default: 'Yes' },
  cancelText: { type: String, default: 'No' },
  // gaya tombol konfirmasi: 'danger' (merah) atau 'primary' (gelap)
  variant: { type: String, default: 'danger' },
  isLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
  >
    <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
      <div class="flex items-start gap-3">
        <div
          class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          :class="variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'"
        >
          <AlertTriangle class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h3 class="text-base font-bold">{{ title }}</h3>
          <p class="text-sm text-gray-600 mt-1 break-words">{{ message }}</p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 mt-6">
        <button
          type="button"
          :disabled="isLoading"
          @click="emit('cancel')"
          class="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          :disabled="isLoading"
          @click="emit('confirm')"
          class="rounded-full px-6 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          :class="variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'"
        >
          {{ isLoading ? 'Processing...' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
