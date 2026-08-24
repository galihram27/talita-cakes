<script setup>
import { watch, onUnmounted } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

/**
 * Dialog "yakin?" serbaguna, dipakai sebelum tindakan yang tidak bisa dibatalkan
 * seperti menghapus produk atau foto galeri.
 *
 * Semua teksnya bisa diatur pemanggil; yang dikosongkan memakai teks bawaan.
 * Komponen ini tidak melakukan apa pun sendiri — ia hanya mengabarkan lewat
 * event `confirm` atau `cancel`.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '' },
  cancelText: { type: String, default: '' },
  // Warna tombol konfirmasi: 'danger' merah untuk hapus, 'primary' untuk lainnya
  variant: { type: String, default: 'danger' },
  isLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
const { t } = useI18n()

// ===== KUNCI GULIRAN HALAMAN =====
// Berbeda dengan modal lain yang memakai `overflow: hidden`, di sini scrollbar
// sengaja dibiarkan tetap ada — menyembunyikannya membuat halaman melebar
// sesaat dan isinya terlihat "melompat" saat dialog muncul.
//
// Gantinya, semua cara menggulir dicegah satu per satu: putaran roda tetikus
// dan usapan jari ditolak, lalu kalau posisinya tetap bergeser (misalnya
// scrollbar diseret atau tombol panah ditekan) langsung dikembalikan.
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

// Jaga-jaga kalau komponen hilang selagi dialog masih terbuka — kalau tidak,
// halaman berikutnya ikut terkunci dan tidak bisa digulir
onUnmounted(unlockScroll)
</script>

<template>
  <!-- Dipindahkan ke <body>. Kalau dibiarkan di tempat asalnya, ia bisa
       terkurung pembungkus halaman yang beranimasi (mis. layout admin),
       sehingga dialog muncul jauh di bawah layar dan latar gelapnya tidak
       menutupi seluruh halaman.
       z-[60] menaruhnya di atas modal lain, supaya dialog "yakin hapus?"
       tetap terlihat saat dibuka dari dalam sebuah modal. -->
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <!-- Ikon peringatan + judul & pesan -->
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

        <!-- Kedua tombol dimatikan selagi proses berjalan, biar tidak
             terpicu dua kali kalau diklik berulang -->
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
