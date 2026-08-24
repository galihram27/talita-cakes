<script setup>
import { ref, computed, onMounted, onServerPrefetch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ArrowRight } from 'lucide-vue-next'
import { useSeoMeta, useHead } from '@unhead/vue'
import { useProductStore } from '@/stores/product.store'
import { DEFAULT_DESCRIPTION, absUrl, bakeryJsonLd } from '@/config/seo'
import ProductCard from '@/components/product/ProductCard.vue'
import GoogleReviews from '@/components/common/GoogleReviews.vue'
import { getSetting } from '@/services/settings.service'
import heroCake from '@/assets/images/hero-cake.png'

const { t } = useI18n()

// Mengatur judul dan deskripsi halaman yang dibaca Google dan muncul
// saat link dibagikan ke WhatsApp/media sosial.
useSeoMeta({
  title: 'Kue Ulang Tahun & Custom Cake Premium di Depok',
  description: DEFAULT_DESCRIPTION,
  ogTitle: "Talita's Cake & Cupcakes — Kue Premium di Depok",
  ogDescription: DEFAULT_DESCRIPTION,
})
// Canonical menandai alamat resmi halaman ini, dan bakeryJsonLd() menyisipkan
// data toko (nama, alamat, jam buka) dalam format yang dimengerti mesin pencari.
useHead({
  link: absUrl('/') ? [{ rel: 'canonical', href: absUrl('/') }] : [],
  script: [bakeryJsonLd()],
})

// Daftar produk diambil dari store supaya bisa dipakai bersama halaman lain.
// Tulisan "loading" hanya ditampilkan kalau datanya memang belum pernah dimuat.
const productStore = useProductStore()
const { products } = storeToRefs(productStore)
const isLoading = ref(!productStore.hasLoaded)

// Yang tampil di bagian favorit adalah produk yang dicentang "featured" oleh admin.
// Kalau admin belum mencentang satu pun, kita ambil 5 produk pertama saja
// supaya bagian ini tidak terlihat kosong.
const featuredProducts = computed(() => {
  const flagged = products.value.filter((p) => p.featured)
  return flagged.length > 0 ? flagged : products.value.slice(0, 5)
})

// Pakai finally supaya loading tetap berhenti walaupun permintaan datanya gagal.
const loadProducts = async () => {
  try {
    await productStore.ensureLoaded()
  } finally {
    isLoading.value = false
  }
}

// Foto besar di bagian atas bisa diganti admin lewat pengaturan "hero-image".
// Kalau belum diatur atau gagal diambil, otomatis pakai foto bawaan (heroCake).
const heroImageUrl = ref('')
const heroSrc = computed(() => heroImageUrl.value || heroCake)
const loadHero = async () => {
  try {
    heroImageUrl.value = (await getSetting('hero-image')) || ''
  } catch {}
}

// Fungsi yang sama dipanggil dua kali dengan tujuan berbeda:
// onServerPrefetch dijalankan saat halaman dibuat jadi HTML (proses build),
// onMounted dijalankan saat halaman dibuka di browser pengunjung.
onServerPrefetch(loadProducts)
onServerPrefetch(loadHero)
onMounted(loadProducts)
onMounted(loadHero)

// Isi 4 kartu tipe pemesanan. Dibungkus computed, bukan array biasa, supaya
// teksnya ikut berganti otomatis ketika pengunjung mengubah bahasa.
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

// Membuat 5 langkah cara pemesanan. Judul dan keterangannya diambil dari file
// terjemahan lewat kunci home.steps.s1 sampai s5, sedangkan nomor 1-5
// dihasilkan otomatis dari urutan index supaya tidak perlu ditulis manual.
const steps = computed(() =>
  ['s1', 's2', 's3', 's4', 's5'].map((key, i) => ({
    n: String(i + 1),
    title: t(`home.steps.${key}.title`),
    desc: t(`home.steps.${key}.desc`),
  }))
)

// Ikon dan teksnya disimpan terpisah: ikon di array ini, teksnya di file
// terjemahan. Keduanya digabungkan berpasangan sesuai urutan, jadi ikon ke-1
// dapat teks home.why.w1, dan seterusnya sampai w6.
const whyIcons = ['❤️', '🎂', '🚚', '⭐', '🥚', '💝']
const whyChoose = computed(() =>
  whyIcons.map((icon, i) => ({ icon, label: t(`home.why.w${i + 1}`) }))
)
</script>

<template>
  <div class="tc-page">
    <!-- Bagian paling atas yang pertama dilihat pengunjung: judul, kalimat
         pembuka, dan dua tombol ajakan (ke Menu dan ke Galeri). -->
    <section class="relative">
      <div class="relative max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 pt-8 md:pt-10 pb-16 tc-fade">
        <div class="relative mx-auto lg:max-w-[1060px] xl:max-w-[1180px]">
          <div class="relative z-10 lg:max-w-[560px] xl:max-w-[620px]">
            <h1 class="font-display text-[clamp(42px,5.5vw,66px)] leading-[1.1] max-w-[680px] mb-5">
              {{ t('home.hero.title') }}
            </h1>
            <p class="text-[19px] leading-relaxed text-[#6E5A4D] max-w-[520px] mb-8">
              {{ t('home.hero.subtitle') }}
            </p>
            <div class="flex gap-3.5 flex-wrap">
              <RouterLink
                to="/menu"
                class="inline-flex items-center bg-brand-500 text-white font-bold text-[16px] px-8 py-4 rounded-full hover:bg-brand-600 transition-colors"
              >
                {{ t('home.hero.viewMenu') }}
              </RouterLink>
              <RouterLink
                to="/gallery"
                class="inline-flex items-center bg-white text-cocoa-900 border border-[#E4D3C1] font-bold text-[16px] px-8 py-4 rounded-full hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {{ t('home.hero.ourGallery') }}
              </RouterLink>
            </div>
          </div>

          <!-- Foto kue. Di layar HP posisinya turun ke bawah teks, sedangkan
               mulai layar besar (lg) dibuat absolute supaya menempel di kanan
               dan bisa bertumpuk dengan teks tanpa mendorongnya. -->
          <div
            class="relative z-0 flex justify-center mt-10 lg:mt-0 lg:absolute lg:top-1/2 lg:right-0 lg:-translate-y-1/2 lg:-translate-x-12 xl:-translate-x-20 lg:w-[360px] xl:w-[420px]"
          >
            <!-- Lingkaran samar di belakang foto, hanya hiasan. Diberi -z-10
                 supaya posisinya tetap di lapisan paling belakang. -->
            <div
              class="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] aspect-square rounded-full bg-brand-100 blur-3xl opacity-60"
            ></div>
            <img
              :src="heroSrc"
              :alt="t('home.hero.imageAlt')"
              width="361"
              height="419"
              fetchpriority="high"
              decoding="async"
              class="w-[68%] max-w-[300px] lg:w-full lg:max-w-none h-auto object-contain drop-shadow-[0_18px_32px_rgba(51,38,31,0.16)]"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Empat kartu tipe pemesanan. Ditulis pakai v-for dari typeCards supaya
         tidak perlu menyalin struktur kartu yang sama sebanyak empat kali. -->
    <section class="relative">
      <div class="relative max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 py-16">
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

    <!-- Menu favorit. Selama data belum siap ditampilkan tulisan "loading"
         (v-if), setelah siap barulah grid produknya muncul (v-else). -->
    <section class="relative">
      <div class="relative max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 py-16">
        <div class="text-center mb-11">
          <h2 class="font-display text-[38px] leading-tight">{{ t('home.favoritesTitle') }}</h2>
        </div>

        <div v-if="isLoading" class="text-center text-cocoa-400 py-12">
          {{ t('home.loadingFavorites') }}
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          <ProductCard v-for="product in featuredProducts" :key="product.id" :product="product" />
        </div>

        <div class="flex justify-center mt-10">
          <RouterLink
            to="/menu"
            class="inline-flex items-center gap-2 bg-brand-500 text-white border border-brand-500 font-bold text-[16px] px-8 py-4 rounded-full hover:bg-brand-600 hover:border-brand-600 transition-colors"
          >
            {{ t('home.allMenu') }}
            <ArrowRight class="w-5 h-5" stroke-width="2" />
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Panduan cara pesan. Tiap langkah dibuat sebagai kartu dengan nomor
         besar di atasnya, diambil dari steps yang dibuat di script. -->
    <section class="relative">
      <div class="relative max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 pt-16 pb-[76px]">
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
              class="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-display text-[26px]"
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

    <!-- Enam poin alasan memilih toko ini, ditampilkan sebagai ikon dan
         tulisan yang berpasangan dari data whyChoose. -->
    <section class="relative">
      <div class="relative max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 py-16">
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

    <!-- Ulasan pelanggan dari Google. Halaman ini cukup memanggil komponennya,
         karena proses ambil datanya sudah diurus di dalam komponen itu. -->
    <div class="relative">
      <GoogleReviews narrow :divider="false" />
    </div>
  </div>
</template>
