<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getProductById } from '@/services/product.service'
import { useProductStore } from '@/stores/product.store'
import ProductType1Detail from '@/components/product/ProductType1Detail.vue'
import ProductType2Detail from '@/components/product/ProductType2Detail.vue'
import ProductType3Detail from '@/components/product/ProductType3Detail.vue'
import ProductType4Detail from '@/components/product/ProductType4Detail.vue'

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
      loadError.value = err.response?.data?.message || 'Produk tidak ditemukan'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchProduct)
</script>

<template>
  <div class="tc-page max-w-[864px] mx-auto px-5 md:px-8 pt-10 pb-20">
    <RouterLink
      to="/menu"
      class="inline-flex items-center gap-1.5 text-cocoa-400 hover:text-brand-500 font-bold text-sm mb-6 transition-colors"
    >
      ← Back to menu
    </RouterLink>

    <div v-if="isLoading" class="text-center py-24 text-cocoa-400">Memuat produk...</div>
    <div v-else-if="loadError" class="text-center py-24 text-brand-600">{{ loadError }}</div>

    <ProductType1Detail v-else-if="product.type === 'TYPE1'" :product="product" />
    <ProductType2Detail v-else-if="product.type === 'TYPE2'" :product="product" />
    <ProductType3Detail v-else-if="product.type === 'TYPE3'" :product="product" />
    <ProductType4Detail v-else-if="product.type === 'TYPE4'" :product="product" />

    <div v-else class="text-center py-24 text-gray-500">
      Halaman detail untuk tipe produk ini belum tersedia.
    </div>
  </div>
</template>