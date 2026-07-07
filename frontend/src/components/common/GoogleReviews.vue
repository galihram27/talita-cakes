<script setup>
import { ref, onMounted } from 'vue'
import { getGoogleReviews } from '@/services/review.service'

const data = ref(null)
const isLoading = ref(true)

onMounted(async () => {
  try {
    data.value = await getGoogleReviews()
  } catch (err) {
    // Belum dikonfigurasi / gagal — section disembunyikan saja
    data.value = null
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div v-if="!isLoading && data && data.reviews.length">
    <hr class="border-gray-200" />

    <section class="max-w-7xl mx-auto px-6 py-16">
    <p class="text-sm font-semibold text-brand-600 mb-2">Testimoni</p>
    <div class="flex flex-wrap items-end justify-between gap-4 mb-10">
      <h2 class="text-3xl font-extrabold">Kata Mereka di Google</h2>

      <div class="flex items-center gap-2">
        <span class="text-2xl font-extrabold">{{ data.rating }}</span>
        <div class="flex text-amber-400">
          <svg
            v-for="i in 5"
            :key="i"
            class="w-5 h-5"
            :class="i <= Math.round(data.rating) ? 'fill-current' : 'fill-gray-200'"
            viewBox="0 0 20 20"
          >
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        </div>
        <span class="text-sm text-gray-500">({{ data.totalReviews }} ulasan)</span>
      </div>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      <article
        v-for="(review, index) in data.reviews.slice(0, 6)"
        :key="index"
        class="rounded-2xl border border-gray-200 p-6 flex flex-col"
      >
        <div class="flex items-center gap-3 mb-3">
          <img
            v-if="review.authorPhoto"
            :src="review.authorPhoto"
            :alt="review.author"
            class="w-10 h-10 rounded-full object-cover"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
          <div
            v-else
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

        <p class="text-sm text-gray-600 leading-relaxed line-clamp-5">
          {{ review.text }}
        </p>
      </article>
    </div>

    <div v-if="data.googleMapsUrl" class="flex justify-center mt-10">
      <a
        :href="data.googleMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-600 hover:text-white transition"
      >
        Lihat Semua Ulasan di Google Maps →
      </a>
    </div>
    </section>
  </div>
</template>
