<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ShoppingCart, Trash2 } from 'lucide-vue-next'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { formatRupiah } from '@/utils/formatCurrency'

const authStore = useAuthStore()
const router = useRouter()

// ===== STATE =====
const cart = ref({ id: null, items: [], subtotal: 0 })
const isLoading = ref(true)
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
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/carts')
    cart.value = data.data
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat keranjang'
  } finally {
    isLoading.value = false
  }
}

// ===== UPDATE QUANTITY =====
const changeQuantity = async (item, delta) => {
  const newQuantity = item.quantity + delta
  if (newQuantity < 1) return

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
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Gagal mengubah jumlah item'
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
    itemToDelete.value = null
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal menghapus item'
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
  <div class="max-w-7xl mx-auto px-6 py-12">
    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-24">
      Memuat keranjang...
    </div>

    <!-- ERROR (hanya bisa muncul untuk user yang sudah login) -->
    <div v-else-if="errorMessage" class="text-center text-red-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY STATE (sesuai wireframe) -->
    <div
      v-else-if="!cart.items || cart.items.length === 0"
      class="flex flex-col items-center justify-center text-center py-24"
    >
      <ShoppingCart class="w-16 h-16 mb-6" stroke-width="1.75" />

      <h1 class="text-2xl font-extrabold mb-2">Your cart is empty</h1>
      <p class="text-sm text-gray-500 mb-8">
        Browse our menu and add some delicious cakes!
      </p>

      <RouterLink
        to="/menu"
        class="rounded-full border border-brand-600 text-brand-600 px-6 py-3 text-sm font-semibold hover:bg-brand-600 hover:text-white transition"
      >
        Browse Menu
      </RouterLink>
    </div>

    <!-- CART DENGAN ISI (sesuai wireframe) -->
    <div v-else>
      <h1 class="text-3xl font-extrabold mb-8">Your Cart</h1>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- DAFTAR ITEM -->
        <div class="lg:col-span-2 space-y-6">
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="rounded-2xl border border-gray-300 p-5 flex gap-5"
          >
            <!-- Gambar produk -->
            <div
              class="shrink-0 w-24 h-28 rounded-xl border border-gray-300 bg-gray-200 overflow-hidden"
            >
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Detail item -->
            <div class="flex-1 min-w-0 flex flex-col">
              <div class="flex items-start justify-between gap-3">
                <h2 class="font-bold truncate">{{ item.productName }}</h2>
                <button
                  type="button"
                  @click="askRemoveItem(item)"
                  class="shrink-0 text-gray-700 hover:text-red-600 transition"
                  aria-label="Hapus item"
                >
                  <Trash2 class="w-5 h-5" />
                </button>
              </div>

              <div class="text-sm text-gray-600 mt-1 space-y-0.5">
                <p v-if="item.flavor">Flavor: {{ item.flavor }}</p>
                <p v-if="item.shape">Shape: {{ item.shape }}</p>
                <p v-if="item.size">Size: {{ item.size }}</p>
                <p v-if="item.textOnCake" class="truncate">
                  Text: {{ item.textOnCake }}
                </p>
              </div>

              <div class="flex items-center justify-between mt-auto pt-4">
                <!-- Stepper quantity -->
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    :disabled="updatingItemId === item.id || item.quantity <= 1"
                    @click="changeQuantity(item, -1)"
                    class="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-lg leading-none hover:bg-gray-100 transition disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Kurangi jumlah"
                  >
                    &minus;
                  </button>
                  <span class="w-6 text-center text-sm font-medium">
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    :disabled="updatingItemId === item.id"
                    @click="changeQuantity(item, 1)"
                    class="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-lg leading-none hover:bg-gray-100 transition disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Tambah jumlah"
                  >
                    +
                  </button>
                </div>

                <p class="font-semibold">{{ formatRupiah(item.lineTotal) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- SUMMARY -->
        <div class="rounded-2xl border border-gray-300 p-6 lg:sticky lg:top-24">
          <h2 class="text-xl font-bold mb-5">Summary</h2>

          <ul class="space-y-3 text-sm">
            <li
              v-for="item in cart.items"
              :key="item.id"
              class="flex items-start justify-between gap-4"
            >
              <span class="text-gray-700">
                {{ item.productName }} x {{ item.quantity }}
              </span>
              <span class="shrink-0 font-medium">
                {{ formatRupiah(item.lineTotal) }}
              </span>
            </li>
          </ul>

          <div class="flex items-center justify-between mt-6">
            <span class="text-lg font-bold">Subtotal</span>
            <span class="text-lg font-bold">
              {{ formatRupiah(cart.subtotal) }}
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-1">+ Delivery fee at checkout</p>

          <button
            type="button"
            @click="goToCheckout"
            class="w-full mt-6 rounded-full border-2 border-brand-600 text-brand-600 py-3 text-sm font-bold hover:bg-brand-600 hover:text-white transition"
          >
            Checkout
          </button>

          <RouterLink
            to="/menu"
            class="block text-center text-sm text-gray-600 hover:text-gray-900 mt-4"
          >
            + Add More Items
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- DIALOG KONFIRMASI HAPUS -->
    <ConfirmDialog
      :open="!!itemToDelete"
      title="Hapus item"
      :message="`Hapus ${itemToDelete?.productName || 'item ini'} dari keranjang?`"
      confirm-text="Hapus"
      cancel-text="Batal"
      :is-loading="isDeleting"
      @confirm="confirmRemoveItem"
      @cancel="itemToDelete = null"
    />
  </div>
</template>
