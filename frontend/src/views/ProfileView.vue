<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CircleUserRound } from 'lucide-vue-next'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { formatRupiah } from '@/utils/formatCurrency'

const authStore = useAuthStore()
const router = useRouter()

// ===== STATE =====
const orders = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const isLoggingOut = ref(false)

const totalOrders = computed(() => orders.value.length)

// ===== FETCH ORDER HISTORY =====
const fetchOrders = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/orders')
    orders.value = data.data
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || 'Gagal memuat riwayat pesanan'
  } finally {
    isLoading.value = false
  }
}

// ===== LOGOUT =====
const handleLogout = async () => {
  isLoggingOut.value = true
  try {
    await authStore.logout()
    router.push('/')
  } finally {
    isLoggingOut.value = false
  }
}

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

onMounted(fetchOrders)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-12">
    <h1 class="text-3xl font-extrabold text-gray-900 mb-8">My Profile</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      <!-- ===== KIRI: KARTU PROFIL ===== -->
      <div class="space-y-4">
        <div
          class="rounded-2xl border border-gray-200 bg-white p-8 text-center"
        >
          <CircleUserRound
            class="w-24 h-24 mx-auto text-gray-400"
            stroke-width="1"
          />

          <p class="mt-4 text-lg font-bold text-gray-900">
            {{ authStore.user?.name }}
          </p>
          <p class="mt-1 text-sm text-gray-600">{{ authStore.user?.email }}</p>
          <p class="text-sm text-gray-600">{{ authStore.user?.phone }}</p>

          <hr class="my-6 border-gray-200" />

          <p class="text-3xl font-bold text-gray-900">{{ totalOrders }}</p>
          <p class="text-sm text-gray-500">Total Pesanan</p>
        </div>

        <!-- Edit profile belum tersedia (belum ada endpoint update profile) -->
        <button
          type="button"
          disabled
          title="Fitur ini segera hadir"
          class="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-400 cursor-not-allowed"
        >
          Edit Profile
        </button>

        <button
          type="button"
          :disabled="isLoggingOut"
          @click="handleLogout"
          class="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-60"
        >
          {{ isLoggingOut ? 'Keluar...' : 'Logout' }}
        </button>
      </div>

      <!-- ===== KANAN: RIWAYAT PESANAN ===== -->
      <div class="md:col-span-2">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Riwayat Pesanan</h2>

        <!-- LOADING -->
        <div v-if="isLoading" class="text-center text-gray-500 py-16">
          Memuat riwayat pesanan...
        </div>

        <!-- ERROR -->
        <div v-else-if="errorMessage" class="text-center text-red-600 py-16">
          {{ errorMessage }}
        </div>

        <!-- KOSONG -->
        <div
          v-else-if="orders.length === 0"
          class="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500"
        >
          Belum ada pesanan.
          <RouterLink to="/menu" class="text-brand-600 font-semibold hover:underline">
            Lihat menu
          </RouterLink>
        </div>

        <!-- LIST ORDER -->
        <div v-else class="space-y-5">
          <div
            v-for="order in orders"
            :key="order.id"
            class="rounded-2xl border border-gray-200 bg-white p-6"
          >
            <!-- Header: tanggal + badge tipe pemesanan -->
            <div class="flex items-center justify-between mb-4">
              <p class="text-sm text-gray-600">
                {{ formatDate(order.createdAt) }}
              </p>
              <span
                class="rounded-full border px-4 py-1 text-xs font-semibold"
                :class="
                  order.fulfillmentType === 'DELIVERY'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-gray-400 text-gray-600'
                "
              >
                {{ order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Pickup' }}
              </span>
            </div>

            <!-- Item pesanan -->
            <div class="space-y-2">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="flex items-center justify-between text-sm text-gray-700"
              >
                <span>{{ item.productName }} x {{ item.quantity }}</span>
                <span>{{ formatRupiah(item.price * item.quantity) }}</span>
              </div>
            </div>

            <hr class="my-4 border-gray-200" />

            <div class="flex items-center justify-between text-sm font-bold text-gray-900">
              <span>Total</span>
              <span>{{ formatRupiah(order.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
