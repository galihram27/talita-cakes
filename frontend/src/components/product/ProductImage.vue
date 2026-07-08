<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  // foto utama / cover (fallback untuk produk lama yang belum punya galeri)
  image: { type: String, default: '' },
  // seluruh foto produk; kalau ada, ditampilkan sebagai galeri
  images: { type: Array, default: () => [] },
  alt: { type: String, default: '' },
})

// daftar foto final: pakai images kalau ada, kalau tidak fallback ke image tunggal
const gallery = computed(() => {
  if (Array.isArray(props.images) && props.images.length) return props.images
  return props.image ? [props.image] : []
})

const activeIndex = ref(0)

// reset ke foto pertama kalau galeri berganti (mis. pindah produk)
watch(gallery, () => {
  activeIndex.value = 0
})

const activeImage = computed(() => gallery.value[activeIndex.value] ?? '')
const hasMultiple = computed(() => gallery.value.length > 1)

// arah geser transisi: 'left' = foto baru masuk dari kanan, 'right' = dari kiri
const slideDirection = ref('left')

// navigasi memutar (dari foto terakhir kembali ke pertama, dan sebaliknya)
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

// tombol panah tampil saat pointer di atas foto, lalu hilang 2 detik setelah pointer keluar
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
  <div class="w-full max-w-sm mx-auto md:mx-0 md:sticky md:top-24">
    <!-- FOTO UTAMA -->
    <div
      class="relative aspect-[3/4] rounded-[20px] border border-cream-300 overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)]"
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
        {{ alt || 'No Image' }}
      </span>

      <!-- PANAH KIRI / KANAN (hanya kalau foto lebih dari 1) -->
      <template v-if="hasMultiple">
        <button
          type="button"
          @click="prev"
          aria-label="Foto sebelumnya"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm border border-cream-300 flex items-center justify-center shadow-sm hover:bg-white transition duration-300"
          :class="controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          type="button"
          @click="next"
          aria-label="Foto berikutnya"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm border border-cream-300 flex items-center justify-center shadow-sm hover:bg-white transition duration-300"
          :class="controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        >
          <ChevronRight class="w-5 h-5" />
        </button>

        <!-- indikator posisi -->
        <span
          class="absolute bottom-3 right-3 rounded-full bg-cocoa-900/60 text-white text-xs px-2.5 py-1"
        >
          {{ activeIndex + 1 }} / {{ gallery.length }}
        </span>
      </template>
    </div>

    <!-- THUMBNAIL (hanya tampil kalau foto lebih dari 1) -->
    <div v-if="hasMultiple" class="flex gap-2.5 mt-3 flex-wrap">
      <button
        v-for="(img, index) in gallery"
        :key="index"
        type="button"
        @click="goTo(index)"
        class="w-[72px] aspect-[3/4] rounded-[10px] border-2 overflow-hidden transition-colors bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
        :class="index === activeIndex ? 'border-brand-500' : 'border-transparent hover:border-brand-500'"
      >
        <img :src="img" :alt="`${alt} ${index + 1}`" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* geser antar foto: foto lama keluar sambil foto baru masuk dari sisi berlawanan */
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
