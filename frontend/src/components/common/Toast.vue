<script setup>
import { watch, onBeforeUnmount, ref } from 'vue'
import { CheckCircle2 } from 'lucide-vue-next'

/**
 * Notifikasi kecil yang muncul sebentar lalu hilang sendiri.
 *
 * Cara pakai: `v-model:message`. Isi dengan teks untuk memunculkannya,
 * dan komponen ini yang mengosongkannya lagi setelah waktunya habis —
 * jadi pemanggil tidak perlu mengurus penyembunyiannya.
 */
const props = defineProps({
  message: { type: String, default: '' },
  duration: { type: Number, default: 2600 },
})

const emit = defineEmits(['update:message'])

const visible = ref(false)
let hideTimer = null

watch(
  () => props.message,
  (msg) => {
    // Batalkan hitungan lama dulu. Tanpa ini, notifikasi kedua yang datang
    // cepat akan ikut terhapus oleh timer notifikasi pertama.
    clearTimeout(hideTimer)
    if (msg) {
      visible.value = true
      hideTimer = setTimeout(() => {
        visible.value = false
        emit('update:message', '')
      }, props.duration)
    } else {
      visible.value = false
    }
  }
)

// Hentikan timer kalau komponen keburu hilang, biar tidak memanggil
// emit ke komponen yang sudah tidak ada
onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="tc-fade fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 rounded-full bg-[#E9F6EE] border border-[#C9E7D6] text-[#2E9E6B] px-5 py-3 text-sm font-bold shadow-[0_10px_30px_-12px_rgba(46,158,107,0.5)]"
      role="status"
    >
      <CheckCircle2 class="w-5 h-5 shrink-0" />
      {{ message }}
    </div>
  </Teleport>
</template>
