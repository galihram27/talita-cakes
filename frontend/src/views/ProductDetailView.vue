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

// Cari dulu produknya di daftar yang sudah dimuat halaman Menu. Kalau ketemu,
// detailnya bisa langsung ditampilkan tanpa spinner. Id-nya diubah ke String
// dulu karena id dari alamat URL selalu berupa teks, sedangkan id di data
// bisa saja berupa angka.
const cached = productStore.products.find((p) => String(p.id) === String(route.params.id))

const product = ref(cached || null)
const isLoading = ref(!cached)
const loadError = ref('')

// Data lengkap tetap diambil dari server, karena daftar di halaman Menu belum
// tentu memuat semua keterangan produk.
const fetchProduct = async () => {
  loadError.value = ''
  try {
    product.value = await getProductById(route.params.id)
  } catch (err) {
    // Kalau data dari cache sudah tampil, kegagalan ini didiamkan saja supaya
    // yang sudah terlihat tidak berubah jadi pesan error.
    if (!product.value) {
      loadError.value = err.response?.data?.message || t('product.notFound')
    }
  } finally {
    isLoading.value = false
  }
}

onServerPrefetch(fetchProduct)
onMounted(fetchProduct)

// Isi meta dibuat sebagai computed karena produknya belum ada saat halaman
// pertama dibuka. Di useSeoMeta di bawah nilainya ditulis sebagai fungsi
// (() => ...), supaya meta ikut diperbarui begitu datanya masuk.
const metaTitle = computed(() => (product.value ? product.value.name : t('product.loading')))
const metaDesc = computed(() =>
  product.value ? truncate(product.value.description) : DEFAULT_DESCRIPTION
)
const metaImage = computed(() => product.value?.image || product.value?.images?.[0] || '')
const canonical = computed(() => absUrl(route.path))

useSeoMeta({
  title: () => metaTitle.value,
  description: () => metaDesc.value,
  ogTitle: () => `${metaTitle.value} - ${SITE_NAME}`,
  ogDescription: () => metaDesc.value,
  ogType: 'product',
  ogImage: () => metaImage.value || undefined,
  ogUrl: () => canonical.value || undefined,
  twitterTitle: () => metaTitle.value,
  twitterDescription: () => metaDesc.value,
  twitterImage: () => metaImage.value || undefined,
})

// Data terstruktur produk (harga, gambar, nama) untuk mesin pencari. Baru
// dipasang setelah produknya ada, jadi tidak ada data kosong yang terkirim.
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

    <!-- Tiap tipe produk punya tampilan detail sendiri karena pilihannya
         berbeda-beda (ukuran, rasa, hiasan). Halaman ini hanya bertugas
         memilih komponen mana yang dipakai sesuai tipe produknya. -->
    <ProductType1Detail v-else-if="product.type === 'TYPE1'" :product="product" />
    <ProductType2Detail v-else-if="product.type === 'TYPE2'" :product="product" />
    <ProductType3Detail v-else-if="product.type === 'TYPE3'" :product="product" />
    <ProductType4Detail v-else-if="product.type === 'TYPE4'" :product="product" />
    <ProductType5Detail v-else-if="product.type === 'TYPE5'" :product="product" />
    <ProductType6Detail v-else-if="product.type === 'TYPE6'" :product="product" />

    <!-- Jaring pengaman kalau suatu saat ada tipe produk baru di server yang
         belum punya tampilan detail di sini. -->
    <div v-else class="text-center py-24 text-gray-500">
      {{ t('product.typeUnavailable') }}
    </div>
  </div>
</template>
