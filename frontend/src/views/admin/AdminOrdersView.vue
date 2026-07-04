<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search } from 'lucide-vue-next'
import { useAdminOrdersStore } from '@/stores/adminOrders.store'
import { formatRupiah } from '@/utils/formatCurrency'

// Data order diambil dari cache store (stale-while-revalidate):
// kunjungan kedua langsung tampil tanpa loading, refresh jalan di background.
const adminOrdersStore = useAdminOrdersStore()

const errorMessage = ref('')
const searchQuery = ref('')

// Loading hanya saat cache belum pernah terisi sama sekali
const isLoading = computed(() => !adminOrdersStore.hasLoaded && !errorMessage.value)

onMounted(async () => {
  try {
    await adminOrdersStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat data orders'
  }
})

// Filter client-side: nama pemesan, kontak, atau nama produk di dalam order
const filteredOrders = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return adminOrdersStore.orders

  return adminOrdersStore.orders.filter((order) => {
    const matchesUser =
      order.user?.name?.toLowerCase().includes(keyword) ||
      order.user?.email?.toLowerCase().includes(keyword) ||
      order.user?.phone?.toLowerCase().includes(keyword)

    const matchesProduct = order.items?.some((item) =>
      item.productName?.toLowerCase().includes(keyword)
    )

    return matchesUser || matchesProduct
  })
})

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
</script>

<template>
  <div>
    <!-- HEADER -->
    <h1 class="text-3xl font-extrabold tracking-tight mb-6">Orders</h1>

    <!-- SEARCH -->
    <div class="relative mb-6 max-w-md">
      <Search class="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search"
        class="w-full rounded-full border border-gray-300 pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
      />
    </div>

    <!-- LIST HEADER -->
    <h2 class="text-lg font-bold mb-4">Orders ({{ filteredOrders.length }})</h2>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-24">Memuat orders...</div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-red-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="text-center text-gray-400 py-24 border border-dashed border-gray-200 rounded-xl"
    >
      {{ searchQuery ? 'Tidak ada order yang cocok' : 'Belum ada order masuk' }}
    </div>

    <!-- ORDER LIST -->
    <div v-else class="space-y-5">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="rounded-2xl border border-gray-200 bg-white p-6"
      >
        <!-- Header: tanggal + pemesan + badge tipe pemesanan -->
        <div class="flex items-center justify-between gap-4 mb-4">
          <div class="min-w-0">
            <p class="text-sm text-gray-600">{{ formatDate(order.createdAt) }}</p>
            <p v-if="order.user" class="text-sm font-semibold text-gray-900 truncate">
              {{ order.user.name }}
              <span class="font-normal text-gray-500">· {{ order.user.phone }}</span>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full border px-4 py-1 text-xs font-semibold"
            :class="
              order.fulfillmentType === 'DELIVERY'
                ? 'border-brand-600 text-brand-600'
                : 'border-gray-400 text-gray-600'
            "
          >
            {{ order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Pick Up' }}
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
</template>
