<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ShoppingBag, X } from 'lucide-vue-next'
import { useCartStore } from '@/stores/cart.store'
import { formatRupiah } from '@/utils/formatCurrency'
import { isBreadCategory, breadSizeForVariant } from '@/config/productOptions'

const { t } = useI18n()
const router = useRouter()
const cartStore = useCartStore()

// Ubah "SQUARE"/"ROUND" jadi "Square"/"Round" agar lebih rapi dibaca.
const formatShape = (shape) =>
  shape ? shape.charAt(0).toUpperCase() + shape.slice(1).toLowerCase() : ''

// Ringkasan opsi item jadi satu baris pendek (rasa · filling · topping · ukuran).
const itemOptions = (item) => {
  const parts = []
  if (item.flavor) parts.push(item.flavor)
  if (item.filling) parts.push(item.filling)
  if (item.topping) parts.push(item.topping)
  // Bread: tampilkan nama ukuran (Personal/Family/Sharing), bukan shape/size mentah.
  if (isBreadCategory(item.productCategory)) {
    const s = breadSizeForVariant(item)
    if (s) parts.push(s.label)
  } else {
    if (item.shape) parts.push(formatShape(item.shape))
    if (item.size) {
      parts.push(
        item.productType === 'TYPE6'
          ? t('product.boxOf', { count: item.size })
          : item.size
      )
    }
  }
  return parts.join(' · ')
}

const isEmpty = computed(() => !cartStore.items || cartStore.items.length === 0)

const goToCart = () => {
  cartStore.closeMini()
  router.push('/cart')
}
</script>

<template>
  <Transition name="mini-cart">
    <div
      v-if="cartStore.isMiniOpen"
      class="absolute right-0 top-[calc(100%+10px)] z-[60] w-[calc(100vw-2.5rem)] max-w-[368px] bg-white border border-[#EBDCCC] rounded-2xl shadow-[0_18px_44px_-14px_rgba(51,38,31,0.4)] overflow-hidden"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <h3 class="font-display text-[17px] leading-none">
          {{ t('miniCart.title') }}
          <span v-if="!isEmpty" class="text-cocoa-400 text-[13px] font-sans font-semibold">
            · {{ t('miniCart.itemsCount', { count: cartStore.count }) }}
          </span>
        </h3>
        <button
          type="button"
          @click="cartStore.closeMini()"
          class="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-cocoa-400 hover:bg-[#F7EEE6] hover:text-cocoa-900 transition-colors"
          :aria-label="t('common.close')"
        >
          <X class="w-4 h-4" stroke-width="2" />
        </button>
      </div>

      <!-- EMPTY -->
      <div v-if="isEmpty" class="px-4 py-8 text-center">
        <div class="text-[34px] mb-2">🧺</div>
        <p class="text-[#6E5A4D] text-sm font-semibold mb-4">
          {{ t('miniCart.empty') }}
        </p>
        <RouterLink
          to="/menu"
          @click="cartStore.closeMini()"
          class="inline-flex bg-brand-500 text-white font-bold text-[13.5px] px-5 py-2.5 rounded-full hover:bg-brand-600 transition-colors"
        >
          {{ t('cart.viewMenu') }}
        </RouterLink>
      </div>

      <!-- ISI -->
      <template v-else>
        <div class="max-h-[46vh] overflow-y-auto px-4 pb-1 flex flex-col divide-y divide-cream-200">
          <div
            v-for="item in cartStore.items"
            :key="item.id"
            class="flex gap-3 py-3 first:pt-1"
          >
            <span
              class="relative shrink-0 w-[52px] h-[52px] rounded-[9px] overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
            >
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
                class="absolute inset-0 w-full h-full object-cover"
              />
            </span>

            <div class="flex-1 min-w-0">
              <p class="font-bold text-[14px] text-cocoa-900 leading-tight truncate">
                {{ item.productName }}
              </p>
              <p
                v-if="itemOptions(item)"
                class="text-[12px] text-cocoa-400 truncate mt-0.5"
              >
                {{ itemOptions(item) }}
              </p>
              <div class="flex items-center justify-between gap-2 mt-1">
                <span class="text-[12.5px] text-[#6E5A4D] font-semibold">
                  {{ item.quantity }} ×
                </span>
                <span class="font-extrabold text-[13.5px] text-brand-500">
                  {{ formatRupiah(item.lineTotal) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-cream-300 px-4 pt-3 pb-4 bg-[#FFFDFB]">
          <div class="flex items-center justify-between mb-3">
            <span class="text-[13.5px] text-[#6E5A4D] font-semibold">
              {{ t('miniCart.subtotal') }}
            </span>
            <strong class="text-[15px] text-cocoa-900">
              {{ formatRupiah(cartStore.subtotal) }}
            </strong>
          </div>
          <button
            type="button"
            @click="goToCart"
            class="w-full flex items-center justify-center gap-1.5 bg-brand-500 text-white font-extrabold text-[14px] py-3 rounded-full hover:bg-brand-600 transition-colors"
          >
            <ShoppingBag class="w-4 h-4" stroke-width="1.9" />
            {{ t('miniCart.viewCart') }}
          </button>
        </div>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.mini-cart-enter-active,
.mini-cart-leave-active {
  transition: transform 0.22s ease, opacity 0.2s ease;
  transform-origin: top right;
}
.mini-cart-enter-from,
.mini-cart-leave-to {
  transform: translateY(-8px) scale(0.97);
  opacity: 0;
}
</style>
