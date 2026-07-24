<script setup>
import { ref, computed, onMounted, onServerPrefetch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeoMeta, useHead } from '@unhead/vue'
import { getProductById } from '@/services/product.service'
import { useProductStore } from '@/stores/product.store'
import { SITE_NAME, DEFAULT_DESCRIPTION, truncate, absUrl, productJsonLd } from '@/config/seo'
import ProductType1Detail from '@/components/product/ProductType1Detail.vue'
import ProductType2Detail from '@/components/product/ProductType2Detail.vue'
import ProductType3Detail from '@/components/product/ProductType3Detail.vue'
import ProductType4Detail from '@/components/product/ProductType4Detail.vue'
import ProductType5Detail from '@/components/product/ProductType5Detail.vue'
import ProductType6Detail from '@/components/product/ProductType6Detail.vue'

const { t } = useI18n()
const route = useRoute()
const productStore = useProductStore()

// Seed dari cache katalog (store) supaya detail langsung tampil tanpa spinner
// saat produk sudah pernah dimuat di halaman Menu. Detail lengkap tetap
// diambil diam-diam di background untuk mengisi field yang mungkin belum ada.
const cached = productStore.products.find(
  (p) => String(p.id) === String(route.params.id)
)

const product = ref(cached || null)
const isLoading = ref(!cached)
const loadError = ref('')

const fetchProduct = async () => {
  loadError.value = ''
  try {
    product.value = await getProductById(route.params.id)
  } catch (err) {
    // Kalau sudah ada data dari cache, jangan timpa dengan pesan error —
    // biarkan detail yang sudah tampil tetap terlihat.
    if (!product.value) {
      loadError.value = err.response?.data?.message || t('product.notFound')
    }
  } finally {
    isLoading.value = false
  }
}

// Prerender (SSG, aktif setelah Fase 4): render detail produk ke HTML saat build.
onServerPrefetch(fetchProduct)
onMounted(fetchProduct)

// ===== SEO per produk (reaktif: terisi setelah produk dimuat) =====
const metaTitle = computed(() => (product.value ? product.value.name : t('product.loading')))
const metaDesc = computed(() =>
  product.value ? truncate(product.value.description) : DEFAULT_DESCRIPTION
)
const metaImage = computed(() => product.value?.image || product.value?.images?.[0] || '')
const canonical = computed(() => absUrl(route.path))

useSeoMeta({
  title: () => metaTitle.value,
  description: () => metaDesc.value,
  ogTitle: () => `${metaTitle.value} · ${SITE_NAME}`,
  ogDescription: () => metaDesc.value,
  ogType: 'product',
  ogImage: () => metaImage.value || undefined,
  ogUrl: () => canonical.value || undefined,
  twitterTitle: () => metaTitle.value,
  twitterDescription: () => metaDesc.value,
  twitterImage: () => metaImage.value || undefined,
})

// canonical + data terstruktur Product (JSON-LD) — hanya kalau produk ada
useHead({
  link: () => (canonical.value ? [{ rel: 'canonical', href: canonical.value }] : []),
  script: () => (product.value ? [productJsonLd(product.value, canonical.value)] : []),
})
</script>

<template>
  <div class="tc-page max-w-[1280px] mx-auto px-5 md:px-10 lg:px-16 pt-10 pb-20">
    <RouterLink
      to="/menu"
      class="inline-flex items-center gap-1.5 text-cocoa-400 hover:text-brand-500 font-bold text-sm mb-6 transition-colors"
    >
      {{ t('product.backToMenu') }}
    </RouterLink>

    <div v-if="isLoading" class="text-center py-24 text-cocoa-400">{{ t('product.loading') }}</div>
    <div v-else-if="loadError" class="text-center py-24 text-brand-600">{{ loadError }}</div>

    <ProductType1Detail v-else-if="product.type === 'TYPE1'" :product="product" />
    <ProductType2Detail v-else-if="product.type === 'TYPE2'" :product="product" />
    <ProductType3Detail v-else-if="product.type === 'TYPE3'" :product="product" />
    <ProductType4Detail v-else-if="product.type === 'TYPE4'" :product="product" />
    <ProductType5Detail v-else-if="product.type === 'TYPE5'" :product="product" />
    <ProductType6Detail v-else-if="product.type === 'TYPE6'" :product="product" />

    <div v-else class="text-center py-24 text-gray-500">
      {{ t('product.typeUnavailable') }}
    </div>
  </div>
</template>