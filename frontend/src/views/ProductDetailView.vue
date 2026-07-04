<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getProductById } from '@/services/product.service'
import ProductType1Detail from '@/components/product/ProductType1Detail.vue'
import ProductType2Detail from '@/components/product/ProductType2Detail.vue'
import ProductType3Detail from '@/components/product/ProductType3Detail.vue'
import ProductType4Detail from '@/components/product/ProductType4Detail.vue'

const route = useRoute()

const product = ref(null)
const isLoading = ref(true)
const loadError = ref('')

const fetchProduct = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    product.value = await getProductById(route.params.id)
  } catch (err) {
    loadError.value = err.response?.data?.message || 'Produk tidak ditemukan'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchProduct)
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 md:px-10 py-12">
    <RouterLink
      to="/menu"
      class="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 mb-8"
    >
      ‹ Back To Menu
    </RouterLink>

    <div v-if="isLoading" class="text-center py-24 text-gray-500">Memuat produk...</div>
    <div v-else-if="loadError" class="text-center py-24 text-red-600">{{ loadError }}</div>

    <ProductType1Detail v-else-if="product.type === 'TYPE1'" :product="product" />
    <ProductType2Detail v-else-if="product.type === 'TYPE2'" :product="product" />
    <ProductType3Detail v-else-if="product.type === 'TYPE3'" :product="product" />
    <ProductType4Detail v-else-if="product.type === 'TYPE4'" :product="product" />

    <div v-else class="text-center py-24 text-gray-500">
      Halaman detail untuk tipe produk ini belum tersedia.
    </div>
  </div>
</template>