<script setup>
import { ref, onMounted } from 'vue'
import ProductCard from '@/components/product/ProductCard.vue'
import api from '@/lib/api'

const featuredProducts = ref([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/products')
    // tampilkan 4 produk pertama sebagai favorit
    featuredProducts.value = (data.data || []).slice(0, 4)
  } catch (err) {
    featuredProducts.value = []
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <!-- HERO -->
    <section class="max-w-7xl mx-auto px-6 pt-16 pb-20">
      <p class="text-sm font-semibold text-brand-600 mb-3">Sejak 2012 ❤</p>
      <h1 class="text-5xl font-extrabold tracking-tight mb-6 max-w-2xl leading-tight">
        Kue Lezat untuk Setiap
        <span class="text-brand-600">Momen Spesialmu</span>
      </h1>

      <p class="text-gray-600 mb-8 max-w-md leading-relaxed">
        Talita's Cake &amp; Cupcakes menghadirkan kue ulang tahun, cupcakes, dan
        kue custom buatan rumahan dengan bahan pilihan — dibuat dengan cinta
        untuk merayakan hari bahagiamu.
      </p>

      <div class="flex items-center gap-4">
        <RouterLink
          to="/menu"
          class="rounded-full bg-brand-600 text-white px-6 py-3 text-sm font-semibold hover:bg-brand-700 transition"
        >
          Lihat Menu
        </RouterLink>
        <RouterLink
          to="/gallery"
          class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold hover:bg-brand-600 hover:text-white transition"
        >
          Lihat Gallery
        </RouterLink>
      </div>
    </section>

    <hr class="border-gray-200" />

    <!-- FEATURED CAKES -->
    <section class="max-w-7xl mx-auto px-6 py-16">
      <h2 class="text-3xl font-extrabold mb-2">Kue Favorit</h2>
      <p class="text-gray-600 mb-8">Pilihan kue yang paling disukai pelanggan kami.</p>

      <div v-if="isLoading" class="text-center text-gray-500 py-12">
        Memuat kue favorit...
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <ProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
        />
      </div>

      <div class="flex justify-center mt-10">
        <RouterLink
          to="/menu"
          class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-600 hover:text-white transition"
        >
          Lihat Semua Menu →
        </RouterLink>
      </div>
    </section>

    <hr class="border-gray-200" />

    <!-- CARA PESAN -->
    <section class="max-w-7xl mx-auto px-6 py-16">
      <p class="text-sm font-semibold text-brand-600 mb-2">Cara Pesan</p>
      <h2 class="text-3xl font-extrabold mb-10">Pesan Kue Impianmu dalam 3 Langkah</h2>

      <div class="grid md:grid-cols-3 gap-6">
        <div class="rounded-2xl border border-gray-200 p-6">
          <div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-extrabold flex items-center justify-center mb-4">
            1
          </div>
          <h3 class="font-bold mb-1.5">Pilih Kue</h3>
          <p class="text-sm text-gray-600 leading-relaxed">
            Jelajahi menu kami dan temukan kue yang pas untuk momenmu — atau cari
            inspirasi desain di halaman gallery.
          </p>
        </div>
        <div class="rounded-2xl border border-gray-200 p-6">
          <div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-extrabold flex items-center justify-center mb-4">
            2
          </div>
          <h3 class="font-bold mb-1.5">Atur Pesananmu</h3>
          <p class="text-sm text-gray-600 leading-relaxed">
            Tentukan ukuran, rasa, dan tulis ucapan spesial. Kue custom? Lampirkan
            referensi desain kesukaanmu.
          </p>
        </div>
        <div class="rounded-2xl border border-gray-200 p-6">
          <div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-extrabold flex items-center justify-center mb-4">
            3
          </div>
          <h3 class="font-bold mb-1.5">Checkout &amp; Terima Kue</h3>
          <p class="text-sm text-gray-600 leading-relaxed">
            Selesaikan pembayaran, lalu kue segar buatan kami siap diantar atau
            diambil sesuai jadwalmu.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>