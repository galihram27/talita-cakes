<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { formatRupiah } from '@/utils/formatCurrency'

const { t, locale } = useI18n()
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
      err.response?.data?.message || t('profile.loadFailed')
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
  new Date(dateString).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

onMounted(fetchOrders)
</script>

<template>
  <div class="tc-page max-w-[900px] mx-auto px-5 md:px-8 pt-12 pb-20">
    <!-- HEADER PROFIL -->
    <div class="flex items-center justify-between gap-4 flex-wrap mb-7">
      <div class="flex items-center gap-4">
        <span
          class="w-14 h-14 rounded-full bg-brand-500 text-white flex items-center justify-center text-[22px] font-extrabold"
        >
          {{ (authStore.user?.name || '?').trim().charAt(0).toUpperCase() }}
        </span>
        <div>
          <h1 class="font-display text-[30px] leading-tight">
            {{ authStore.user?.name }}
          </h1>
          <div class="text-cocoa-400 text-sm">
            {{ authStore.user?.email }} · {{ authStore.user?.phone }}
          </div>
        </div>
      </div>
      <button
        type="button"
        :disabled="isLoggingOut"
        @click="handleLogout"
        class="border-[1.5px] border-[#E4D3C1] bg-white text-[#6E5A4D] font-bold text-sm px-5 py-2.5 rounded-full hover:border-brand-500 hover:text-brand-500 transition-colors disabled:opacity-60"
      >
        {{ isLoggingOut ? t('profile.loggingOut') : t('profile.logout') }}
      </button>
    </div>

    <!-- RIWAYAT PESANAN -->
    <h2 class="font-display text-[23px] mb-4">
      {{ t('profile.orderHistory') }}
      <span class="text-cocoa-400 text-sm font-sans font-bold">({{ totalOrders }})</span>
    </h2>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-16">
      {{ t('profile.loading') }}
    </div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-brand-600 py-16">
      {{ errorMessage }}
    </div>

    <!-- KOSONG -->
    <div
      v-else-if="orders.length === 0"
      class="bg-white border border-dashed border-[#E4D3C1] rounded-2xl p-10 text-center text-cocoa-400"
    >
      {{ t('profile.empty') }}
      <RouterLink to="/menu" class="text-brand-500 font-extrabold hover:opacity-70">
        {{ t('profile.startOrdering') }}
      </RouterLink>
    </div>

    <!-- LIST ORDER -->
    <div v-else class="flex flex-col gap-3.5">
      <div
        v-for="order in orders"
        :key="order.id"
        class="bg-white border border-cream-300 rounded-2xl px-6 py-5"
      >
        <!-- Header: tanggal + badge tipe pemesanan -->
        <div class="flex justify-between items-center gap-3 flex-wrap mb-2.5">
          <p class="text-[13px] text-[#B7A18E] font-semibold">
            {{ t('profile.created', { date: formatDate(order.createdAt) }) }}
          </p>
          <span
            class="rounded-full px-3 py-1 text-xs font-extrabold tracking-wide"
            :class="
              order.fulfillmentType === 'DELIVERY'
                ? 'bg-brand-100 text-brand-500'
                : 'bg-cream-100 text-[#6E5A4D]'
            "
          >
            {{ order.fulfillmentType === 'DELIVERY' ? t('profile.delivery') : t('profile.pickup') }}
          </span>
        </div>

        <!-- Item pesanan -->
        <div class="flex flex-col gap-1.5 mb-3">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex items-center justify-between text-sm text-[#6E5A4D]"
          >
            <span>{{ item.productName }} ×{{ item.quantity }}</span>
            <span>{{ formatRupiah(item.price * item.quantity) }}</span>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-cream-200 pt-3 text-sm"
        >
          <span class="font-bold">{{ t('profile.total') }}</span>
          <span class="font-extrabold text-brand-500">
            {{ formatRupiah(order.total) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
