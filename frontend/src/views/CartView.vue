<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Trash2, ArrowLeft } from 'lucide-vue-next'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { formatRupiah } from '@/utils/formatCurrency'
import {
  isGoodiebagCupcake,
  goodiebagMinQty,
  isBreadCategory,
  breadSizeForVariant,
} from '@/config/productOptions'

// Menyusun tulisan ukuran untuk produk roti, karena bentuknya bermacam-macam:
// ada yang dijual per kotak, ada yang persegi (butuh dua sisi), dan ada yang
// bulat (cukup satu ukuran).
const breadSizeText = (item) => {
  const s = breadSizeForVariant(item)
  if (!s) return item.size
  const dim =
    s.shape === null
      ? t('product.boxOf', { count: s.size })
      : s.shape === 'SQUARE'
        ? `${s.size}×${s.sizeB ?? s.size} cm`
        : `${s.size} cm`
  return `${s.label} · ${dim}`
}

// Cupcake goodiebag punya jumlah pesanan minimal (tidak bisa beli satuan),
// sedangkan produk lain minimalnya 1.
const minQtyForItem = (item) =>
  isGoodiebagCupcake(item.productCategory) ? goodiebagMinQty(item.productCategory) : 1

const { t } = useI18n()
const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()

// Isi awal diambil dari store (yang dipakai badge keranjang di menu atas),
// supaya isi keranjang langsung terlihat sambil data terbarunya diambil.
const cart = ref({
  id: null,
  items: [...cartStore.items],
  subtotal: cartStore.subtotal,
})
const isLoading = ref(!cartStore.loaded)
const errorMessage = ref('')

// Menyimpan id barang yang jumlahnya sedang diubah, supaya hanya tombol
// milik barang itu yang dikunci, bukan seluruh keranjang.
const updatingItemId = ref(null)

const formatShape = (shape) =>
  shape ? shape.charAt(0).toUpperCase() + shape.slice(1).toLowerCase() : ''

const itemToDelete = ref(null)
const isDeleting = ref(false)

const fetchCart = async () => {
  // Keranjang tersimpan di server per akun, jadi tanpa login isinya pasti
  // kosong dan tidak perlu meminta apa pun.
  if (!authStore.isAuthenticated) {
    cart.value = { id: null, items: [], subtotal: 0 }
    cartStore.setFromItems([])
    isLoading.value = false
    return
  }

  errorMessage.value = ''
  try {
    const { data } = await api.get('/carts')
    cart.value = data.data
    cartStore.setFromItems(cart.value.items)
  } catch (err) {
    // Kalau isi keranjang dari store sudah tampil, kegagalan ini didiamkan
    // supaya yang sudah terlihat tidak berubah jadi pesan error.
    if (!cartStore.loaded) {
      errorMessage.value = err.response?.data?.message || t('cart.loadFailed')
    }
  } finally {
    isLoading.value = false
  }
}

// Menangani tombol + dan −. delta bernilai +1 atau −1.
const changeQuantity = async (item, delta) => {
  const newQuantity = item.quantity + delta
  const minQty = minQtyForItem(item)

  // Produk dengan jumlah minimal tidak boleh dikurangi sampai di bawah batasnya.
  if (minQty > 1 && newQuantity < minQty) return

  // Dikurangi sampai nol berarti barangnya dikeluarkan dari keranjang.
  if (newQuantity < 1) {
    updatingItemId.value = item.id
    try {
      await api.delete(`/carts/items/${item.id}`)
      cart.value.items = cart.value.items.filter((i) => i.id !== item.id)
      cart.value.subtotal = cart.value.items.reduce((sum, i) => sum + i.lineTotal, 0)
      cartStore.setFromItems(cart.value.items)
    } catch (err) {
      errorMessage.value = err.response?.data?.message || t('cart.removeFailed')
    } finally {
      updatingItemId.value = null
    }
    return
  }

  updatingItemId.value = item.id
  try {
    await api.patch(`/carts/items/${item.id}`, { quantity: newQuantity })

    // Setelah server menyetujui, angka di layar diperbarui: jumlah barang,
    // harga barisnya, lalu subtotal dihitung ulang dari seluruh baris.
    item.quantity = newQuantity
    item.lineTotal = item.price * newQuantity
    cart.value.subtotal = cart.value.items.reduce((sum, i) => sum + i.lineTotal, 0)
    cartStore.setFromItems(cart.value.items)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('cart.updateQtyFailed')
  } finally {
    updatingItemId.value = null
  }
}

const askRemoveItem = (item) => {
  itemToDelete.value = item
}

const confirmRemoveItem = async () => {
  if (!itemToDelete.value) return

  isDeleting.value = true
  try {
    await api.delete(`/carts/items/${itemToDelete.value.id}`)
    cart.value.items = cart.value.items.filter((i) => i.id !== itemToDelete.value.id)
    cart.value.subtotal = cart.value.items.reduce((sum, i) => sum + i.lineTotal, 0)
    // setFromItems menyamakan isi store, supaya angka pada ikon keranjang
    // di menu atas ikut berubah tanpa perlu memuat ulang halaman.
    cartStore.setFromItems(cart.value.items)
    itemToDelete.value = null
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('cart.removeFailed')
  } finally {
    isDeleting.value = false
  }
}

const goToCheckout = () => {
  router.push('/checkout')
}

onMounted(fetchCart)
</script>

<template>
  <div class="tc-page max-w-[1160px] mx-auto px-5 md:px-8 pt-12 pb-20">
    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">
      {{ t('cart.loading') }}
    </div>

    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

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

    <div v-else>
      <RouterLink
        to="/menu"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6E5A4D] hover:text-brand-500 mb-4 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" stroke-width="2" />
        {{ t('cart.backToMenu') }}
      </RouterLink>
      <h1 class="font-display text-[40px] mb-6">{{ t('cart.title') }}</h1>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div class="flex flex-col gap-4">
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="flex gap-4 bg-white border border-cream-300 rounded-2xl p-4"
          >
            <span
              class="relative shrink-0 self-start w-[84px] aspect-square rounded-[10px] overflow-hidden bg-[repeating-linear-gradient(45deg,#F6EDE4_0_8px,#F0E3D6_8px_16px)]"
            >
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
                class="absolute inset-0 w-full h-full object-cover"
              />
            </span>

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

              <!-- Rincian pilihan pembeli (rasa, isian, topping, dan seterusnya).
                   Semuanya diberi v-if karena tiap tipe produk punya pilihan
                   berbeda — yang tidak dipilih tidak ikut ditampilkan. -->
              <div class="flex flex-col gap-0.5 text-[13.5px] text-[#6E5A4D] mt-1">
                <p v-if="item.flavor">
                  <span class="text-cocoa-400">{{ t('cart.flavor') }}</span>
                  <strong class="text-[#4A3A30] ml-1">{{ item.flavor }}</strong>
                </p>
                <p v-if="item.filling">
                  <span class="text-cocoa-400">{{ t('cart.filling') }}</span>
                  <strong class="text-[#4A3A30] ml-1">{{ item.filling }}</strong>
                </p>
                <p v-if="item.topping">
                  <span class="text-cocoa-400">{{ t('cart.topping') }}</span>
                  <strong class="text-[#4A3A30] ml-1">{{ item.topping }}</strong>
                </p>
                <p v-if="item.shape">
                  <span class="text-cocoa-400">{{ t('cart.shape') }}</span>
                  <strong class="text-[#4A3A30] ml-1">{{ formatShape(item.shape) }}</strong>
                </p>
                <!-- Tiga cara menulis ukuran: roti punya bentuk sendiri,
                     cupcake (TYPE6) dihitung per kotak, sisanya ditulis apa
                     adanya. -->
                <p v-if="isBreadCategory(item.productCategory)">
                  <span class="text-cocoa-400">{{ t('cart.size') }}</span>
                  <strong class="text-[#4A3A30] ml-1">{{ breadSizeText(item) }}</strong>
                </p>
                <p v-else-if="item.size">
                  <span class="text-cocoa-400">
                    {{ item.productType === 'TYPE6' ? t('cart.box') : t('cart.size') }}
                  </span>
                  <strong class="text-[#4A3A30] ml-1">
                    {{
                      item.productType === 'TYPE6'
                        ? t('product.boxOf', { count: item.size })
                        : item.size
                    }}
                  </strong>
                </p>
                <p v-if="item.textOnCake" class="truncate">
                  <span class="text-cocoa-400">{{ t('cart.text') }}</span>
                  <strong class="text-[#4A3A30] ml-1">{{ item.textOnCake }}</strong>
                </p>
              </div>

              <div class="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <div
                  class="flex items-center border-[1.5px] border-[#E4D3C1] rounded-full bg-white"
                >
                  <!-- Tombol kurang dimatikan saat sedang menyimpan, atau saat
                       jumlahnya sudah menyentuh batas minimal produk itu. -->
                  <button
                    type="button"
                    :disabled="
                      updatingItemId === item.id ||
                      (minQtyForItem(item) > 1 && item.quantity <= minQtyForItem(item))
                    "
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

        <!-- Ringkasan belanja. lg:sticky membuat kotak ini ikut turun mengikuti
           gulir di layar lebar, jadi tombol checkout selalu terlihat.
           Ongkos kirim belum dihitung di sini karena baru diketahui setelah
           pembeli menentukan alamat di halaman checkout. -->
        <div class="bg-white border border-cream-300 rounded-2xl p-6 lg:sticky lg:top-24">
          <h2 class="font-display text-[21px] mb-4">{{ t('cart.summary') }}</h2>

          <div class="flex justify-between text-[14.5px] text-[#6E5A4D] py-2">
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
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="!!itemToDelete"
      :title="t('cart.confirmRemoveTitle')"
      :message="
        t('cart.confirmRemoveMessage', { name: itemToDelete?.productName || t('cart.thisItem') })
      "
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      :is-loading="isDeleting"
      @confirm="confirmRemoveItem"
      @cancel="itemToDelete = null"
    />
  </div>
</template>
