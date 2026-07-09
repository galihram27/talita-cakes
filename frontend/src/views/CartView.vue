<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Trash2 } from 'lucide-vue-next'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { formatRupiah } from '@/utils/formatCurrency'

const { t } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()

// ===== STATE =====
// Seed dari cache store kalau ada, supaya halaman langsung tampil tanpa spinner.
const cart = ref({
  id: null,
  items: [...cartStore.items],
  subtotal: cartStore.subtotal,
})
// Spinner hanya ditampilkan kalau cart belum pernah diambil sama sekali.
const isLoading = ref(!cartStore.loaded)
const errorMessage = ref('')

// id item yang sedang di-update quantity-nya (disable tombol +/- item itu)
const updatingItemId = ref(null)

// state dialog hapus item
const itemToDelete = ref(null)
const isDeleting = ref(false)

// ===== FETCH CART =====
const fetchCart = async () => {
  // Guest (belum login): jangan panggil API cart sama sekali.
  // Kalau tetap di-hit, request akan gagal 401, lalu axios interceptor
  // otomatis coba POST /auth/refresh-token untuk auto-refresh — dan karena
  // guest memang belum pernah login (tidak ada cookie refresh token sama
  // sekali), backend balikin pesan "Refresh token required" yang KELIRU
  // kalau ditampilkan sebagai error di halaman cart. Untuk guest, cukup
  // tampilkan langsung state cart kosong.
  if (!authStore.isAuthenticated) {
    cart.value = { id: null, items: [], subtotal: 0 }
    cartStore.setFromItems([])
    isLoading.value = false
    return
  }

  // Kalau cache sudah ada, refresh dilakukan diam-diam di background (tidak
  // menampilkan spinner penuh yang membuat isi cart berkedip hilang-muncul).
  errorMessage.value = ''
  try {
    const { data } = await api.get('/carts')
    cart.value = data.data
    cartStore.setFromItems(cart.value.items)
  } catch (err) {
    // Hanya tampilkan error kalau memang belum ada data yang bisa ditampilkan.
    if (!cartStore.loaded) {
      errorMessage.value =
        err.response?.data?.message || t('cart.loadFailed')
    }
  } finally {
    isLoading.value = false
  }
}

// ===== UPDATE QUANTITY =====
const changeQuantity = async (item, delta) => {
  const newQuantity = item.quantity + delta

  // Jumlah 1 dikurangi lagi = item langsung dihapus dari keranjang
  // (tanpa dialog konfirmasi — mengurangi sampai 0 sudah aksi yang disengaja).
  if (newQuantity < 1) {
    updatingItemId.value = item.id
    try {
      await api.delete(`/carts/items/${item.id}`)
      cart.value.items = cart.value.items.filter((i) => i.id !== item.id)
      cart.value.subtotal = cart.value.items.reduce(
        (sum, i) => sum + i.lineTotal,
        0
      )
      cartStore.setFromItems(cart.value.items)
    } catch (err) {
      errorMessage.value =
        err.response?.data?.message || t('cart.removeFailed')
    } finally {
      updatingItemId.value = null
    }
    return
  }

  updatingItemId.value = item.id
  try {
    await api.patch(`/carts/items/${item.id}`, { quantity: newQuantity })
    // update lokal supaya UI langsung berubah tanpa flicker loading penuh
    item.quantity = newQuantity
    item.lineTotal = item.price * newQuantity
    cart.value.subtotal = cart.value.items.reduce(
      (sum, i) => sum + i.lineTotal,
      0
    )
    cartStore.setFromItems(cart.value.items)
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || t('cart.updateQtyFailed')
  } finally {
    updatingItemId.value = null
  }
}

// ===== REMOVE ITEM =====
const askRemoveItem = (item) => {
  itemToDelete.value = item
}

const confirmRemoveItem = async () => {
  if (!itemToDelete.value) return

  isDeleting.value = true
  try {
    await api.delete(`/carts/items/${itemToDelete.value.id}`)
    cart.value.items = cart.value.items.filter(
      (i) => i.id !== itemToDelete.value.id
    )
    cart.value.subtotal = cart.value.items.reduce(
      (sum, i) => sum + i.lineTotal,
      0
    )
    cartStore.setFromItems(cart.value.items)
    itemToDelete.value = null
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('cart.removeFailed')
  } finally {
    isDeleting.value = false
  }
}

// ===== CHECKOUT =====
const goToCheckout = () => {
  router.push('/checkout')
}

onMounted(fetchCart)
</script>

<template>
  <div class="tc-page max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-20">
    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">
      {{ t('cart.loading') }}
    </div>

    <!-- ERROR (hanya bisa muncul untuk user yang sudah login) -->
    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY STATE -->
    <template v-else-if="!cart.items || cart.items.length === 0">
      <h1 class="font-display text-[40px] mb-6">{{ t('cart.title') }}</h1>
      <div
        class="text-center bg-white border border-dashed border-[#E4D3C1] rounded-[20px] px-6 py-16"
      >
        <div class="text-[40px] mb-3">🧺</div>
        <div class="font-display text-2xl mb-2">{{ t('cart.emptyTitle') }}</div>
        <p class="text-[#6E5A4D] mb-5">{{ t('cart.emptyDesc') }}</p>
        <RouterLink
          to="/menu"
          class="inline-flex bg-brand-500 text-white font-bold text-[15px] px-6 py-3 rounded-full hover:bg-brand-600 transition-colors"
        >
          {{ t('cart.viewMenu') }}
        </RouterLink>
      </div>
    </template>

    <!-- CART DENGAN ISI -->
    <div v-else>
      <h1 class="font-display text-[40px] mb-6">{{ t('cart.title') }}</h1>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <!-- DAFTAR ITEM -->
        <div class="flex flex-col gap-4">
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="flex gap-4 bg-white border border-cream-300 rounded-2xl p-4"
          >
            <!-- Gambar produk -->
            <span
              class="relative shrink-0 w-[84px] aspect-[3/4] rounded-[10px] overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
            >
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
                class="absolute inset-0 w-full h-full object-cover"
              />
            </span>

            <!-- Detail item -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <h2 class="font-display text-[19px] leading-snug mt-0.5">
                  {{ item.productName }}
                </h2>
                <button
                  type="button"
                  @click="askRemoveItem(item)"
                  class="shrink-0 inline-flex items-center justify-center p-2 rounded-[9px] bg-[#FBE9E7] text-brand-500 hover:bg-[#F5D6D2] transition-colors"
                  :aria-label="t('cart.removeItem')"
                >
                  <Trash2 class="w-[17px] h-[17px]" stroke-width="1.8" />
                </button>
              </div>

              <div class="flex flex-col gap-0.5 text-[13.5px] text-[#6E5A4D] mt-1">
                <p v-if="item.flavor">
                  <span class="text-cocoa-400">{{ t('cart.flavor') }}</span>
                  <strong class="text-[#4A3A30]"> {{ item.flavor }}</strong>
                </p>
                <p v-if="item.shape">
                  <span class="text-cocoa-400">{{ t('cart.shape') }}</span>
                  <strong class="text-[#4A3A30]"> {{ item.shape }}</strong>
                </p>
                <p v-if="item.size">
                  <span class="text-cocoa-400">{{ t('cart.size') }}</span>
                  <strong class="text-[#4A3A30]"> {{ item.size }}</strong>
                </p>
                <p v-if="item.textOnCake" class="truncate">
                  <span class="text-cocoa-400">{{ t('cart.text') }}</span>
                  <strong class="text-[#4A3A30]"> {{ item.textOnCake }}</strong>
                </p>
              </div>

              <div class="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <!-- Stepper quantity -->
                <div class="flex items-center border-[1.5px] border-[#E4D3C1] rounded-full bg-white">
                  <button
                    type="button"
                    :disabled="updatingItemId === item.id"
                    @click="changeQuantity(item, -1)"
                    class="w-[34px] h-[34px] text-[15px] text-brand-500 font-extrabold rounded-full hover:bg-brand-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    :aria-label="t('product.orderForm.decreaseQty')"
                  >
                    &minus;
                  </button>
                  <span class="min-w-[26px] text-center font-extrabold text-sm">
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    :disabled="updatingItemId === item.id"
                    @click="changeQuantity(item, 1)"
                    class="w-[34px] h-[34px] text-[15px] text-brand-500 font-extrabold rounded-full hover:bg-brand-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    :aria-label="t('product.orderForm.increaseQty')"
                  >
                    +
                  </button>
                </div>

                <p class="font-extrabold text-base text-brand-500">
                  {{ formatRupiah(item.lineTotal) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- SUMMARY -->
        <div
          class="bg-white border border-cream-300 rounded-2xl p-6 lg:sticky lg:top-24"
        >
          <h2 class="font-display text-[21px] mb-4">{{ t('cart.summary') }}</h2>

          <div
            class="flex justify-between text-[14.5px] text-[#6E5A4D] py-2"
          >
            <span>{{ t('cart.subtotal', { count: cart.items.length }) }}</span>
            <strong class="text-cocoa-900">{{ formatRupiah(cart.subtotal) }}</strong>
          </div>
          <div
            class="flex justify-between text-[14.5px] text-[#6E5A4D] py-2 border-b border-cream-200"
          >
            <span>{{ t('cart.deliveryFee') }}</span>
            <span class="text-[13px]">{{ t('cart.calculatedAtCheckout') }}</span>
          </div>
          <div class="flex justify-between text-base font-extrabold pt-3.5 pb-4">
            <span>{{ t('cart.estimatedTotal') }}</span>
            <span class="text-brand-500">{{ formatRupiah(cart.subtotal) }}</span>
          </div>

          <button
            type="button"
            @click="goToCheckout"
            class="w-full flex justify-center bg-brand-500 text-white font-extrabold text-[15.5px] py-[15px] rounded-full hover:bg-brand-600 transition-colors"
          >
            {{ t('cart.continueCheckout') }}
          </button>

          <p class="text-[12.5px] text-cocoa-400 text-center mt-2.5">
            {{ t('cart.paymentNote') }}
          </p>

          <RouterLink
            to="/menu"
            class="block text-center text-sm text-[#6E5A4D] hover:text-brand-500 mt-3 transition-colors"
          >
            {{ t('cart.addMore') }}
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- DIALOG KONFIRMASI HAPUS -->
    <ConfirmDialog
      :open="!!itemToDelete"
      :title="t('cart.confirmRemoveTitle')"
      :message="t('cart.confirmRemoveMessage', { name: itemToDelete?.productName || t('cart.thisItem') })"
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      :is-loading="isDeleting"
      @confirm="confirmRemoveItem"
      @cancel="itemToDelete = null"
    />
  </div>
</template>
