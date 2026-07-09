<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import { useAdminOrdersStore } from '@/stores/adminOrders.store'
import { formatRupiah } from '@/utils/formatCurrency'

// Data order diambil dari cache store (stale-while-revalidate):
// kunjungan kedua langsung tampil tanpa loading, refresh jalan di background.
const { t, locale } = useI18n()
const adminOrdersStore = useAdminOrdersStore()

const errorMessage = ref('')
const searchQuery = ref('')

// Loading hanya saat cache belum pernah terisi sama sekali
const isLoading = computed(() => !adminOrdersStore.hasLoaded && !errorMessage.value)

onMounted(async () => {
  try {
    await adminOrdersStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('admin.orders.loadFailed')
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
  new Date(dateString).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
</script>

<template>
  <div>
    <!-- HEADER -->
    <h1 class="text-4xl mb-8">{{ t('admin.orders.title') }}</h1>

    <!-- SEARCH -->
    <div class="flex items-center gap-4 mb-6">
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 text-cocoa-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('admin.orders.searchPlaceholder')"
          class="w-full rounded-full border border-cream-300 bg-white pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
        />
      </div>
      <p class="text-sm font-semibold text-cocoa-400 shrink-0">{{ t('admin.orders.orderCount', { count: filteredOrders.length }) }}</p>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">{{ t('admin.orders.loading') }}</div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

    <!-- EMPTY -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="text-center text-cocoa-400 py-24 bg-white rounded-2xl border border-dashed border-cream-300"
    >
      {{ searchQuery ? t('admin.orders.noMatch') : t('admin.orders.empty') }}
    </div>

    <!-- ORDER LIST -->
    <div v-else class="space-y-5">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] p-6"
      >
        <!-- Header: tanggal + pemesan + badge tipe pemesanan -->
        <div class="flex items-center justify-between gap-4 mb-4">
          <div class="min-w-0">
            <p class="text-sm text-cocoa-400">{{ formatDate(order.createdAt) }}</p>
            <p v-if="order.user" class="text-sm font-bold text-cocoa-900 truncate">
              {{ order.user.name }}
              <span class="font-normal text-cocoa-400">· {{ order.user.phone }}</span>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-4 py-1 text-xs font-bold"
            :class="
              order.fulfillmentType === 'DELIVERY'
                ? 'bg-brand-100 text-brand-600'
                : 'bg-cream-100 text-cocoa-500'
            "
          >
            {{ order.fulfillmentType === 'DELIVERY' ? t('admin.orders.delivery') : t('admin.orders.pickup') }}
          </span>
        </div>

        <!-- Item pesanan -->
        <div class="space-y-2">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex items-center justify-between text-sm text-cocoa-500"
          >
            <span>{{ item.productName }} x {{ item.quantity }}</span>
            <span>{{ formatRupiah(item.price * item.quantity) }}</span>
          </div>
        </div>

        <hr class="my-4 border-cream-200" />

        <div class="flex items-center justify-between text-sm font-bold">
          <span class="text-cocoa-900">{{ t('admin.orders.total') }}</span>
          <span class="text-brand-600 font-extrabold">{{ formatRupiah(order.total) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
