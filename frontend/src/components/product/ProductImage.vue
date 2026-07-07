<script setup>
import { computed, ref, watch } from 'vue'
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

// navigasi memutar (dari foto terakhir kembali ke pertama, dan sebaliknya)
const prev = () => {
  const len = gallery.value.length
  if (len < 2) return
  activeIndex.value = (activeIndex.value - 1 + len) % len
}
const next = () => {
  const len = gallery.value.length
  if (len < 2) return
  activeIndex.value = (activeIndex.value + 1) % len
}
</script>

<template>
  <div class="w-full max-w-sm mx-auto md:mx-0 md:sticky md:top-24">
    <!-- FOTO UTAMA -->
    <div
      class="relative aspect-[3/4] rounded-[20px] border border-cream-300 overflow-hidden group bg-[repeating-linear-gradient(45deg,#F6EDE4_0_10px,#F0E3D6_10px_20px)]"
    >
      <img
        v-if="activeImage"
        :src="activeImage"
        :alt="alt"
        class="absolute inset-0 w-full h-full object-contain"
      />
      <span
        v-else
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
          class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm border border-cream-300 flex items-center justify-center shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          type="button"
          @click="next"
          aria-label="Foto berikutnya"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm border border-cream-300 flex items-center justify-center shadow-sm hover:bg-white transition opacity-0 group-hover:opacity-100 focus:opacity-100"
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
        @click="activeIndex = index"
        class="w-[72px] aspect-[3/4] rounded-[10px] border-2 overflow-hidden transition-colors bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
        :class="index === activeIndex ? 'border-brand-500' : 'border-transparent hover:border-brand-500'"
      >
        <img :src="img" :alt="`${alt} ${index + 1}`" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>
