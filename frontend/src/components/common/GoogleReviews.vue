<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// grid = tampil 3 review per baris (dipakai di Home).
// Default (carousel) = satu baris dengan scroll + tombol navigasi (About).
// narrow = persempit lebar carousel agar ±3 review pertama langsung terlihat.
defineProps({
  grid: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false },
  // divider = garis pemisah di atas section reviews (dimatikan di Home).
  divider: { type: Boolean, default: true },
})

const scroller = ref(null)

const scrollBy = (direction) => {
  const el = scroller.value
  if (!el) return
  // Geser sejauh satu kartu (+ jarak antar kartu)
  const card = el.querySelector('article')
  const amount = card ? card.offsetWidth + 24 : el.clientWidth * 0.8
  el.scrollBy({ left: direction * amount, behavior: 'smooth' })
}

// Tombol navigasi tampil saat pointer di area review, lalu menghilang
// beberapa detik setelah pointer keluar.
const controlsVisible = ref(false)
let hideTimer = null

const showControls = () => {
  if (hideTimer) clearTimeout(hideTimer)
  controlsVisible.value = true
}

const scheduleHide = () => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    controlsVisible.value = false
  }, 2000)
}

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})

// Ulasan asli pelanggan dari Google Maps, disalin manual.
// Tautan "Lihat Semua Ulasan" mengarah ke halaman Google Maps toko
// agar pengunjung bisa memverifikasi langsung ke sumbernya.
const data = {
  rating: 5.0,
  totalReviews: 5,
  googleMapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Talita%27s%20Cake%20%26%20Cupcakes&query_place_id=ChIJGWhCQZjraS4RGsVnp6ic14c',
  reviews: [
    {
      author: 'agin',
      rating: 5,
      relativeTime: '6 bulan lalu',
      text: 'enak banget kuenya, lembut, pluffy, ih mantap banget, bakal jadi langganan🥰',
    },
    {
      author: 'Aphet Felix',
      rating: 5,
      relativeTime: '5 bulan lalu',
      text: 'Pelayanan baik, walaupun saya jauh , pesanan tetep bisa di kirim dengan delivery khusus kue jadi aman, sukses terus.',
    },
    {
      author: 'S&Q official',
      rating: 5,
      relativeTime: '6 bulan lalu',
      text: 'Enak enak kuenya ga pernah gagal, harga murah kue enak pelayanannya cepat bisa request, yang paling penting itu bersih terimakasih selalu ada',
    },
    {
      author: 'Tri Wahyuni Bunny',
      rating: 5,
      relativeTime: '3 bulan lalu',
      text: 'Seller amanah, kuenya enak, bisa custom sesuai request.. terima kasih ya kak..',
    },
    {
      author: 'Ika Nur Laili',
      rating: 5,
      relativeTime: 'sebulan lalu',
      text: 'Kuenya enak banget lembut, manisnya gk bikin eneg dan desain kue sesuai request',
    },
  ],
}
</script>

<template>
  <div v-if="data.reviews.length">
    <hr v-if="divider" class="border-gray-200" />

    <section class="mx-auto px-6 py-16" :class="narrow ? 'max-w-5xl' : 'max-w-7xl'">
    <div class="mb-10">
      <h2 class="text-3xl font-extrabold">{{ t('reviews.title') }}</h2>
      <p class="mt-3 max-w-3xl text-gray-600 leading-relaxed">
        {{ t('reviews.subtitle') }}
      </p>
    </div>

    <div
      class="relative"
      @mouseenter="showControls"
      @mouseleave="scheduleHide"
    >
      <template v-if="!grid">
        <button
          type="button"
          aria-label="Sebelumnya"
          class="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-11 h-11 rounded-full bg-white border border-gray-300 text-gray-600 items-center justify-center shadow-md hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-opacity duration-300"
          :class="controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
          @click="scrollBy(-1)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Berikutnya"
          class="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-11 h-11 rounded-full bg-white border border-gray-300 text-gray-600 items-center justify-center shadow-md hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-opacity duration-300"
          :class="controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
          @click="scrollBy(1)"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </template>

      <div
        ref="scroller"
        :class="grid
          ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
          : 'flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory reviews-scroll'"
      >
      <article
        v-for="(review, index) in data.reviews"
        :key="index"
        class="rounded-2xl border border-gray-200 bg-[#FFF6FA] p-6 flex flex-col"
        :class="grid ? '' : 'shrink-0 snap-start w-[85%] sm:w-80'"
      >
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-extrabold flex items-center justify-center"
          >
            {{ review.author.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="font-bold text-sm">{{ review.author }}</p>
            <p class="text-xs text-gray-500">{{ review.relativeTime }}</p>
          </div>
        </div>

        <div class="flex text-amber-400 mb-3">
          <svg
            v-for="i in 5"
            :key="i"
            class="w-4 h-4"
            :class="i <= review.rating ? 'fill-current' : 'fill-gray-200'"
            viewBox="0 0 20 20"
          >
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        </div>

        <p class="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {{ review.text }}
        </p>
      </article>
      </div>
    </div>

    <div v-if="data.googleMapsUrl" class="flex justify-center mt-10">
      <a
        :href="data.googleMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-600 hover:text-white transition"
      >
        {{ t('reviews.viewAll') }}
      </a>
    </div>
    </section>
  </div>
</template>

<style scoped>
.reviews-scroll {
  scrollbar-width: thin;
  scrollbar-color: #e78fa6 rgba(185, 58, 60, 0.08);
}
.reviews-scroll::-webkit-scrollbar {
  height: 8px;
}
.reviews-scroll::-webkit-scrollbar-track {
  background: rgba(185, 58, 60, 0.08);
  border-radius: 9999px;
  margin: 0 2px;
}
.reviews-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #f7b2c4, #e0607e);
  border-radius: 9999px;
  transition: background 0.25s ease;
}
.reviews-scroll::-webkit-scrollbar-thumb:hover {
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(224, 96, 126, 0.5);
}
</style>
