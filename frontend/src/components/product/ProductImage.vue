<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const { t } = useI18n()

/**
 * Galeri foto di halaman produk: satu foto besar, panah kiri-kanan,
 * dan deretan foto kecil di bawahnya.
 */
const props = defineProps({
  // Foto tunggal, dipakai produk lama yang dibuat sebelum ada galeri
  image: { type: String, default: '' },
  images: { type: Array, default: () => [] },
  alt: { type: String, default: '' },
  /**
   * Foto yang ingin ditampilkan atas permintaan komponen induk — misalnya
   * saat pembeli memilih isi box, galeri ikut berpindah ke foto box itu.
   * Sifatnya hanya mengarahkan, bukan mengunci: setelah itu pembeli tetap
   * bebas menggeser galeri sendiri.
   */
  activeUrl: { type: String, default: '' },
})

// Utamakan galeri; kalau kosong, foto tunggal diperlakukan sebagai
// galeri berisi satu foto agar sisa kode tidak perlu membedakannya
const gallery = computed(() => {
  if (Array.isArray(props.images) && props.images.length) return props.images
  return props.image ? [props.image] : []
})

const activeIndex = ref(0)

// Pindah produk -> kembali ke foto pertama, jangan meneruskan posisi lama
watch(gallery, () => {
  activeIndex.value = 0
})

const activeImage = computed(() => gallery.value[activeIndex.value] ?? '')
const hasMultiple = computed(() => gallery.value.length > 1)

// Menentukan arah animasi: foto baru masuk dari kanan atau dari kiri
const slideDirection = ref('left')

// Perpindahan foto berputar — dari foto terakhir lanjut ke foto pertama.
// Sisa bagi (%) yang membuatnya berputar; +len pada prev supaya hasilnya
// tidak negatif saat mundur dari foto pertama.
const prev = () => {
  const len = gallery.value.length
  if (len < 2) return
  slideDirection.value = 'right'
  activeIndex.value = (activeIndex.value - 1 + len) % len
}
const next = () => {
  const len = gallery.value.length
  if (len < 2) return
  slideDirection.value = 'left'
  activeIndex.value = (activeIndex.value + 1) % len
}
const goTo = (index) => {
  if (index === activeIndex.value) return
  slideDirection.value = index > activeIndex.value ? 'left' : 'right'
  activeIndex.value = index
}

// Ikuti permintaan induk. Kalau fotonya tidak ada di galeri — misalnya varian
// itu belum diberi foto — galeri dibiarkan pada foto yang sedang tampil,
// karena itu lebih baik daripada melompat ke foto yang keliru.
watch(
  () => props.activeUrl,
  (url) => {
    if (!url) return
    const index = gallery.value.indexOf(url)
    if (index >= 0) goTo(index)
  },
  { immediate: true }
)

// Panah hanya muncul saat kursor berada di atas foto, lalu menghilang sendiri
// dua detik setelah kursor pergi — biar tidak menutupi fotonya
const controlsVisible = ref(false)
let hideControlsTimer = null

const showControls = () => {
  clearTimeout(hideControlsTimer)
  controlsVisible.value = true
}
const scheduleHideControls = () => {
  clearTimeout(hideControlsTimer)
  hideControlsTimer = setTimeout(() => {
    controlsVisible.value = false
  }, 2000)
}

onBeforeUnmount(() => clearTimeout(hideControlsTimer))
</script>

<template>
  <!-- sticky: di layar lebar, foto ikut menempel saat pembeli menggulir
       pilihan ukuran & rasa di sebelahnya -->
  <div class="w-full max-w-[440px] mx-auto md:mx-0 md:sticky md:top-24">
    <!-- Foto besar. object-contain dipakai supaya kue tidak terpotong,
         berapa pun perbandingan sisi foto aslinya. -->
    <div
      class="relative aspect-square rounded-[20px] border border-cream-300 overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)]"
      @mouseenter="showControls"
      @mouseleave="scheduleHideControls"
    >
      <Transition :name="`photo-slide-${slideDirection}`">
        <img
          v-if="activeImage"
          :key="activeIndex"
          :src="activeImage"
          :alt="alt"
          class="absolute inset-0 w-full h-full object-contain"
        />
      </Transition>
      <span
        v-if="!activeImage"
        class="absolute inset-0 flex items-center justify-center font-mono text-xs text-[#A08874] text-center p-5"
      >
        {{ alt || t('product.noImage') }}
      </span>

      <!-- Panah & indikator hanya berguna kalau fotonya lebih dari satu -->
      <template v-if="hasMultiple">
        <button
          type="button"
          @click="prev"
          :aria-label="t('product.prevPhoto')"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm border border-cream-300 flex items-center justify-center shadow-sm hover:bg-white transition duration-300"
          :class="controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          type="button"
          @click="next"
          :aria-label="t('product.nextPhoto')"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm border border-cream-300 flex items-center justify-center shadow-sm hover:bg-white transition duration-300"
          :class="controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        >
          <ChevronRight class="w-5 h-5" />
        </button>

        <!-- Penanda "3 / 8" di pojok foto -->
        <span
          class="absolute bottom-3 right-3 rounded-full bg-cocoa-900/60 text-white text-xs px-2.5 py-1"
        >
          {{ activeIndex + 1 }} / {{ gallery.length }}
        </span>
      </template>
    </div>

    <!-- Deretan foto kecil. Di sini object-cover (bukan contain) supaya
         semuanya sama besar dan berjajar rapi. -->
    <div v-if="hasMultiple" class="flex gap-2.5 mt-3 flex-wrap">
      <button
        v-for="(img, index) in gallery"
        :key="index"
        type="button"
        @click="goTo(index)"
        class="w-[72px] aspect-square rounded-[10px] border-2 overflow-hidden transition-colors bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
        :class="index === activeIndex ? 'border-brand-500' : 'border-transparent hover:border-brand-500'"
      >
        <img :src="img" :alt="`${alt} ${index + 1}`" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Animasi geser antar foto. Dibuat dua rangkaian karena arahnya harus
   mengikuti tombol yang ditekan: maju bergeser ke kiri, mundur ke kanan. */
.photo-slide-left-enter-active,
.photo-slide-left-leave-active,
.photo-slide-right-enter-active,
.photo-slide-right-leave-active {
  transition: transform 0.35s ease;
}
/* next: foto baru masuk dari kanan, foto lama keluar ke kiri */
.photo-slide-left-enter-from {
  transform: translateX(100%);
}
.photo-slide-left-leave-to {
  transform: translateX(-100%);
}
/* prev: foto baru masuk dari kiri, foto lama keluar ke kanan */
.photo-slide-right-enter-from {
  transform: translateX(-100%);
}
.photo-slide-right-leave-to {
  transform: translateX(100%);
}
</style>
