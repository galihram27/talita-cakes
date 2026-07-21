<script setup>
import { watch, onUnmounted } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '' },
  cancelText: { type: String, default: '' },
  // gaya tombol konfirmasi: 'danger' (merah) atau 'primary' (gelap)
  variant: { type: String, default: 'danger' },
  isLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
const { t } = useI18n()

// Kunci scroll halaman selama dialog terbuka TANPA menghilangkan scrollbar
// (overflow tidak diubah, jadi scrollbar tetap terlihat & latar tidak melompat).
// Semua cara menggulir dicegah: wheel/touch di-block, dan kalau posisi tetap
// bergeser (drag scrollbar / keyboard) langsung dikembalikan.
let lockedScrollY = 0

const blockScroll = (e) => e.preventDefault()
const keepPosition = () => window.scrollTo(0, lockedScrollY)

const lockScroll = () => {
  lockedScrollY = window.scrollY
  window.addEventListener('wheel', blockScroll, { passive: false })
  window.addEventListener('touchmove', blockScroll, { passive: false })
  window.addEventListener('scroll', keepPosition, { passive: true })
}

const unlockScroll = () => {
  window.removeEventListener('wheel', blockScroll)
  window.removeEventListener('touchmove', blockScroll)
  window.removeEventListener('scroll', keepPosition)
}

watch(
  () => props.open,
  (open) => (open ? lockScroll() : unlockScroll())
)

// Jaga-jaga kalau komponen di-unmount saat dialog masih terbuka.
onUnmounted(unlockScroll)
</script>

<template>
  <!-- Teleport ke <body> supaya overlay tidak terjebak containing-block dari
       ancestor yang punya transform (mis. layout admin) — tanpa ini, `fixed`
       jadi relatif ke ancestor tsb, bukan viewport, sehingga dialog muncul
       di bawah layar dan latar gelap tidak menutup penuh. -->
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
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
            <h3 class="text-base font-bold">{{ title || t('common.confirmation') }}</h3>
            <p class="text-sm text-gray-600 mt-1 break-words">{{ message || t('common.areYouSure') }}</p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            :disabled="isLoading"
            @click="emit('cancel')"
            class="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            {{ cancelText || t('common.no') }}
          </button>
          <button
            type="button"
            :disabled="isLoading"
            @click="emit('confirm')"
            class="rounded-full px-6 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            :class="variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'"
          >
            {{ isLoading ? t('common.processing') : confirmText || t('common.yes') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
