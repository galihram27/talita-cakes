<script setup>
import { ref, computed, onMounted, onServerPrefetch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSeoMeta, useHead } from '@unhead/vue'
import { useProductStore } from '@/stores/product.store'
import { DEFAULT_DESCRIPTION, absUrl, bakeryJsonLd } from '@/config/seo'
import ProductCard from '@/components/product/ProductCard.vue'
import GoogleReviews from '@/components/common/GoogleReviews.vue'

const { t } = useI18n()

// SEO Home: judul marketing + deskripsi + data terstruktur usaha (Bakery).
useSeoMeta({
  title: 'Kue Ulang Tahun & Custom Cake Premium di Depok',
  description: DEFAULT_DESCRIPTION,
  ogTitle: 'Talita\'s Cake & Cupcakes — Kue Premium di Depok',
  ogDescription: DEFAULT_DESCRIPTION,
})
useHead({
  link: absUrl('/') ? [{ rel: 'canonical', href: absUrl('/') }] : [],
  script: [bakeryJsonLd()],
})

// Sumber data sama dengan halaman Menu: store dengan cache localStorage +
// stale-while-revalidate. Kunjungan berikutnya favorit langsung tampil dari
// cache (loading instan), refresh berjalan diam-diam di background.
const productStore = useProductStore()
const { products } = storeToRefs(productStore)
const isLoading = ref(!productStore.hasLoaded)

// Produk yang ditandai admin (flag `featured`) dipajang di section ini.
// Kalau admin belum menandai satu pun, jatuh ke 4 produk pertama supaya
// section tidak kosong.
const featuredProducts = computed(() => {
  const flagged = products.value.filter((p) => p.featured)
  return flagged.length > 0 ? flagged : products.value.slice(0, 4)
})

const loadProducts = async () => {
  try {
    await productStore.ensureLoaded()
  } finally {
    isLoading.value = false
  }
}
// Prerender (SSG): isi katalog saat build supaya produk favorit masuk ke HTML.
onServerPrefetch(loadProducts)
onMounted(loadProducts)

// Kartu tipe produk (dari desain)
const typeCards = computed(() => [
  {
    tag: t('home.types.t1.tag'),
    desc: t('home.types.t1.desc'),
    features: [
      t('home.features.fixedSize'),
      t('home.features.fixedFlavor'),
      t('home.features.fixedDecoration'),
    ],
  },
  {
    tag: t('home.types.t2.tag'),
    desc: t('home.types.t2.desc'),
    features: [
      t('home.features.fixedSize'),
      t('home.features.chooseFlavor'),
      t('home.features.simpleDecoration'),
    ],
  },
  {
    tag: t('home.types.t3.tag'),
    desc: t('home.types.t3.desc'),
    features: [
      t('home.features.chooseSize'),
      t('home.features.fixedFlavor'),
      t('home.features.fixedDecoration'),
    ],
  },
  {
    tag: t('home.types.t4.tag'),
    desc: t('home.types.t4.desc'),
    features: [
      t('home.features.chooseSize'),
      t('home.features.chooseFlavor'),
      t('home.features.customDesign'),
      t('home.features.uploadInspiration'),
    ],
  },
])

const steps = computed(() =>
  ['s1', 's2', 's3', 's4', 's5'].map((key, i) => ({
    n: String(i + 1),
    title: t(`home.steps.${key}.title`),
    desc: t(`home.steps.${key}.desc`),
  }))
)

const whyIcons = ['❤️', '🎂', '🚚', '⭐', '🥚', '💝']
const whyChoose = computed(() =>
  whyIcons.map((icon, i) => ({ icon, label: t(`home.why.w${i + 1}`) }))
)
</script>

<template>
  <div class="tc-page">
    <!-- HERO -->
    <section class="relative">
      <div
        class="relative max-w-[1160px] mx-auto px-5 md:px-8 pt-8 md:pt-10 pb-16 tc-fade"
      >
        <h1
          class="font-display text-[clamp(38px,5vw,58px)] leading-[1.12] max-w-[620px] mb-4"
        >
          {{ t('home.hero.title') }}
        </h1>
        <p class="text-[17px] leading-relaxed text-[#6E5A4D] max-w-[480px] mb-7">
          {{ t('home.hero.subtitle') }}
        </p>
        <div class="flex gap-3 flex-wrap">
          <RouterLink
            to="/menu"
            class="inline-flex items-center bg-brand-500 text-white font-bold text-[15px] px-7 py-3.5 rounded-full hover:bg-brand-600 transition-colors"
          >
            {{ t('home.hero.viewMenu') }}
          </RouterLink>
          <RouterLink
            to="/gallery"
            class="inline-flex items-center bg-white text-cocoa-900 border border-[#E4D3C1] font-bold text-[15px] px-7 py-3.5 rounded-full hover:border-brand-500 hover:text-brand-500 transition-colors"
          >
            {{ t('home.hero.ourGallery') }}
          </RouterLink>
        </div>
        <div class="flex gap-8 mt-10 flex-wrap">
          <div>
            <div class="font-display text-[26px]">{{ t('home.stats.years') }}</div>
            <div class="text-[13px] text-cocoa-400">{{ t('home.stats.yearsDesc') }}</div>
          </div>
          <div>
            <div class="font-display text-[26px]">{{ t('home.stats.cakes') }}</div>
            <div class="text-[13px] text-cocoa-400">{{ t('home.stats.cakesDesc') }}</div>
          </div>
          <div>
            <div class="font-display text-[26px]">{{ t('home.stats.made') }}</div>
            <div class="text-[13px] text-cocoa-400">{{ t('home.stats.madeDesc') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TIPE KUE -->
    <section class="relative border-y border-cream-200">
      <div class="relative max-w-[1160px] mx-auto px-5 md:px-8 py-16">
        <h2 class="font-display text-[32px] mb-2">
          {{ t('home.typesTitle') }}
        </h2>
        <p class="text-[#6E5A4D] text-[15.5px] mb-8">
          {{ t('home.typesSubtitle') }}
        </p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RouterLink
            v-for="card in typeCards"
            :key="card.tag"
            to="/menu"
            class="flex flex-col gap-3.5 bg-white border border-cream-300 rounded-2xl p-6 shadow-sm hover:border-[#E4C9B4] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(51,38,31,0.08)] transition-all"
          >
            <span
              class="self-start text-[11px] font-extrabold tracking-[0.1em] uppercase text-brand-500 bg-brand-50 px-3 py-1 rounded-full"
            >
              {{ card.tag }}
            </span>
            <span class="text-sm leading-relaxed text-[#8A7566]">
              {{ card.desc }}
            </span>
            <span class="flex flex-col gap-1.5">
              <span
                v-for="f in card.features"
                :key="f"
                class="flex items-center gap-2 text-[13.5px] font-bold text-[#5C4A3E]"
              >
                <span class="text-[#3E7A4E]">✔</span>{{ f }}
              </span>
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- FEATURED / FAVORITES -->
    <section class="relative">
      <div class="relative max-w-[1160px] mx-auto px-5 md:px-8 py-16">
      <div class="flex items-baseline justify-between gap-4 flex-wrap mb-7">
        <div>
          <h2 class="font-display text-[32px] mb-1">{{ t('home.favoritesTitle') }}</h2>
          <p class="text-[#6E5A4D] text-[15.5px]">
            {{ t('home.favoritesSubtitle') }}
          </p>
        </div>
        <RouterLink
          to="/menu"
          class="text-brand-500 font-extrabold text-[14.5px] hover:opacity-65 transition-opacity"
        >
          {{ t('home.allMenu') }}
        </RouterLink>
      </div>

      <div v-if="isLoading" class="text-center text-cocoa-400 py-12">
        {{ t('home.loadingFavorites') }}
      </div>
      <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <ProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
        />
      </div>
      </div>
    </section>

    <!-- CARA PESAN (5 LANGKAH) -->
    <section class="relative">
      <div class="relative max-w-[1160px] mx-auto px-5 md:px-8 pt-16 pb-[76px]">
        <div class="text-center max-w-[560px] mx-auto mb-11">
          <h2 class="font-display text-[38px] leading-tight">
            {{ t('home.stepsTitle') }}
          </h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div
            v-for="step in steps"
            :key="step.n"
            class="relative bg-white border border-[#EFE0D2] rounded-[22px] px-5 pt-7 pb-6 flex flex-col gap-3.5 shadow-sm"
          >
            <div
              class="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-display text-[26px] shadow-[0_8px_16px_rgba(185,58,60,0.28)]"
            >
              {{ step.n }}
            </div>
            <div class="font-display text-xl text-cocoa-900">{{ step.title }}</div>
            <div class="text-[13.5px] leading-relaxed text-[#6E5A4D]">
              {{ step.desc }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- WHY CHOOSE -->
    <section class="relative border-t border-cream-200">
      <div class="relative max-w-[1160px] mx-auto px-5 md:px-8 py-16">
        <div class="text-center max-w-[560px] mx-auto mb-10">
          <h2 class="font-display text-[34px] leading-tight">
            {{ t('home.whyTitle') }}
          </h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="item in whyChoose"
            :key="item.label"
            class="flex items-center gap-4 bg-cream-50 border border-[#F0E3D6] rounded-2xl px-5 py-5"
          >
            <span
              class="shrink-0 w-12 h-12 rounded-[14px] bg-brand-50 flex items-center justify-center text-2xl leading-none"
            >
              {{ item.icon }}
            </span>
            <span class="font-display text-lg leading-tight text-cocoa-900">
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- GOOGLE REVIEWS -->
    <div class="relative">
      <GoogleReviews narrow />
    </div>
  </div>
</template>
