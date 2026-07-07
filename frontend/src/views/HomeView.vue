<script setup>
import { ref, onMounted } from 'vue'
import ProductCard from '@/components/product/ProductCard.vue'
import GoogleReviews from '@/components/common/GoogleReviews.vue'
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

// Kartu tipe produk (dari desain)
const typeCards = [
  {
    tag: 'Signature Collection',
    desc: 'Perfect for customers who love our ready-made designs.',
    features: ['Fixed Size', 'Fixed Flavor', 'Fixed Decoration'],
  },
  {
    tag: 'Flavor & Design Choice',
    desc: 'Choose your favorite flavor while keeping the original cake size.',
    features: ['Fixed Size', 'Choose Flavor', 'Simple Decoration Customization'],
  },
  {
    tag: 'Choose Your Size',
    desc: 'Love the design but need a different size?',
    features: ['Choose Size', 'Fixed Flavor', 'Fixed Decoration'],
  },
  {
    tag: 'Fully Custom Cake',
    desc: "Create a cake that's uniquely yours.",
    features: ['Choose Size', 'Choose Flavor', 'Custom Design', 'Upload Inspiration Photo'],
  },
]

const steps = [
  {
    n: '1',
    title: 'Choose Your Cake',
    desc: 'Browse our menu and select your favorite cake. Customize the size, flavor, and design (if available), then upload your inspiration photo for custom orders.',
  },
  {
    n: '2',
    title: 'Select Your Date',
    desc: 'Choose your preferred pickup or delivery date. We recommend placing your order at least 3 days in advance. For large cakes or highly customized designs, we recommend ordering earlier to ensure the best results.',
  },
  {
    n: '3',
    title: 'Submit Your Order',
    desc: 'Your order summary will be generated automatically. Simply send it to us via WhatsApp to continue the ordering process.',
  },
  {
    n: '4',
    title: 'Order Confirmation',
    desc: 'Our team will review your order, confirm availability, delivery details, and payment. Once everything is confirmed, your cake will be freshly baked and handcrafted for your special day.',
  },
]

const whyChoose = [
  { icon: '❤️', label: 'Baked Fresh After You Order' },
  { icon: '🎂', label: 'Fully Customizable' },
  { icon: '🚚', label: 'Delivery Available' },
  { icon: '⭐', label: 'Trusted Since 2012' },
  { icon: '🥚', label: 'Premium & Halal Ingredients' },
  { icon: '💝', label: 'Baked with Love' },
]
</script>

<template>
  <div class="tc-page">
    <!-- HERO -->
    <section class="max-w-[1160px] mx-auto px-5 md:px-8 pt-16 md:pt-[72px] pb-16">
      <div class="tc-fade">
        <h1
          class="font-display text-[clamp(38px,5vw,58px)] leading-[1.12] max-w-[620px] mb-4"
        >
          Every Celebration Begins with a Beautiful Cake
        </h1>
        <p class="text-[17px] leading-relaxed text-[#6E5A4D] max-w-[480px] mb-7">
          Freshly baked custom cakes and premium desserts, handcrafted to make
          birthdays, weddings, anniversaries, baby showers, graduations, and
          every celebration truly unforgettable.
        </p>
        <div class="flex gap-3 flex-wrap">
          <RouterLink
            to="/menu"
            class="inline-flex items-center bg-brand-500 text-white font-bold text-[15px] px-7 py-3.5 rounded-full hover:bg-brand-600 transition-colors"
          >
            View Menu
          </RouterLink>
          <RouterLink
            to="/gallery"
            class="inline-flex items-center bg-white text-cocoa-900 border border-[#E4D3C1] font-bold text-[15px] px-7 py-3.5 rounded-full hover:border-brand-500 hover:text-brand-500 transition-colors"
          >
            Our Gallery
          </RouterLink>
        </div>
        <div class="flex gap-8 mt-10 flex-wrap">
          <div>
            <div class="font-display text-[26px]">12+ Years</div>
            <div class="text-[13px] text-cocoa-400">Baking Happiness Since 2012</div>
          </div>
          <div>
            <div class="font-display text-[26px]">3000+ Cakes</div>
            <div class="text-[13px] text-cocoa-400">Handcrafted with Love</div>
          </div>
          <div>
            <div class="font-display text-[26px]">Made by Order</div>
            <div class="text-[13px] text-cocoa-400">Freshly Baked for Every Order</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TIPE KUE -->
    <section class="bg-white border-y border-cream-200">
      <div class="max-w-[1160px] mx-auto px-5 md:px-8 py-16">
        <h2 class="font-display text-[32px] mb-2">
          Find the Perfect Cake for Your Celebration
        </h2>
        <p class="text-[#6E5A4D] text-[15.5px] mb-8">
          Whether you're looking for a ready-to-order favorite or a fully
          customized creation, we'll help you find the perfect cake for your
          special celebration.
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
    <section class="max-w-[1160px] mx-auto px-5 md:px-8 py-16">
      <div class="flex items-baseline justify-between gap-4 flex-wrap mb-7">
        <div>
          <h2 class="font-display text-[32px] mb-1">Customer favorites</h2>
          <p class="text-[#6E5A4D] text-[15.5px]">
            The ones ordered again and again.
          </p>
        </div>
        <RouterLink
          to="/menu"
          class="text-brand-500 font-extrabold text-[14.5px] hover:opacity-65 transition-opacity"
        >
          All menu →
        </RouterLink>
      </div>

      <div v-if="isLoading" class="text-center text-cocoa-400 py-12">
        Memuat kue favorit...
      </div>
      <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <ProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
        />
      </div>
    </section>

    <!-- CARA PESAN (4 LANGKAH) -->
    <section class="bg-gradient-to-b from-cream-100 to-cream-400">
      <div class="max-w-[1160px] mx-auto px-5 md:px-8 pt-16 pb-[76px]">
        <div class="text-center max-w-[560px] mx-auto mb-11">
          <h2 class="font-display text-[38px] leading-tight">
            Order your cake in 4 simple steps
          </h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    <section class="bg-white border-t border-cream-200">
      <div class="max-w-[1160px] mx-auto px-5 md:px-8 py-16">
        <div class="text-center max-w-[560px] mx-auto mb-10">
          <h2 class="font-display text-[34px] leading-tight">
            Why Choose Talita's Cake
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
    <GoogleReviews />
  </div>
</template>
