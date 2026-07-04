<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Users, ClipboardList, Package, ImageIcon } from 'lucide-vue-next'
import { useAnalyticsStore } from '@/stores/analytics.store'

// ===== FILTER BULAN =====
const selectedMonth = ref('all')

const monthOptions = computed(() => {
  const options = [{ value: 'all', label: 'All Months' }]
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }

  return options
})

const buildQueryParams = () => {
  if (selectedMonth.value === 'all') {
    return { groupBy: 'month' }
  }

  const [year, month] = selectedMonth.value.split('-').map(Number)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    groupBy: 'day',
  }
}

// ===== STATE =====
// Data diambil dari cache store (stale-while-revalidate): kunjungan kedua
// dan seterusnya langsung tampil tanpa loading, refresh jalan di background.
const analyticsStore = useAnalyticsStore()
const errorMessage = ref('')

const dashboard = computed(() => analyticsStore.cache[selectedMonth.value])
// Loading hanya saat belum ada cache untuk filter bulan yang dipilih
const isLoading = computed(() => !dashboard.value && !errorMessage.value)

const visitorChart = computed(() => dashboard.value?.visitors ?? [])
const orderChart = computed(() => dashboard.value?.orders ?? [])

const statCards = computed(() => [
  { label: 'Total Visitors', value: dashboard.value?.totalVisitors ?? 0, icon: Users },
  { label: 'Total Orders', value: dashboard.value?.totalOrders ?? 0, icon: ClipboardList },
  { label: 'Active Products', value: dashboard.value?.totalProducts ?? 0, icon: Package },
  { label: 'Gallery Images', value: dashboard.value?.totalGalleryImages ?? 0, icon: ImageIcon },
])

// ===== FETCH =====
const fetchDashboard = async () => {
  errorMessage.value = ''
  try {
    await analyticsStore.ensureLoaded(selectedMonth.value, buildQueryParams())
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat data analytics'
  }
}

onMounted(fetchDashboard)
watch(selectedMonth, fetchDashboard)

// ===== CHART HELPERS =====
const formatChartLabel = (raw) => {
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)

  if (selectedMonth.value === 'all') {
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  }

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const barHeight = (count, data) => {
  const max = Math.max(...data.map((d) => d.count), 1)
  return `${Math.round((count / max) * 100)}%`
}
</script>

<template>
  <div>
    <!-- HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <h1 class="text-3xl font-extrabold tracking-tight">Dashboard Analytics</h1>

      <select
        v-model="selectedMonth"
        class="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:border-brand-500"
      >
        <option v-for="opt in monthOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-gray-500 py-24">
      Memuat analytics...
    </div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-red-600 py-24">
      {{ errorMessage }}
    </div>

    <template v-else>
      <!-- STAT CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="rounded-xl border border-gray-200 p-5 flex items-center gap-4"
        >
          <div class="rounded-full bg-gray-100 p-3 shrink-0">
            <component :is="card.icon" class="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p class="text-2xl font-extrabold">{{ card.value.toLocaleString('id-ID') }}</p>
            <p class="text-sm text-gray-500">{{ card.label }}</p>
          </div>
        </div>
      </div>

      <!-- CHARTS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Visitors Chart -->
        <div class="rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-bold mb-6">Visitors per Month</h2>

          <div
            v-if="visitorChart.length === 0"
            class="h-48 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg"
          >
            Chart
          </div>

          <div v-else class="h-48 flex items-end gap-1.5">
            <div
              v-for="(point, idx) in visitorChart"
              :key="idx"
              class="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div class="w-full h-40 flex items-end">
                <div
                  class="w-full bg-gray-300 rounded-t-sm transition-all"
                  :style="{ height: barHeight(point.count, visitorChart) }"
                  :title="`${formatChartLabel(point.date)}: ${point.count}`"
                />
              </div>
              <span class="text-[10px] text-gray-400 truncate w-full text-center">
                {{ formatChartLabel(point.date) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Orders Chart -->
        <div class="rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-bold mb-6">Orders per Month</h2>

          <div
            v-if="orderChart.length === 0"
            class="h-48 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg"
          >
            Chart
          </div>

          <div v-else class="h-48 flex items-end gap-1.5">
            <div
              v-for="(point, idx) in orderChart"
              :key="idx"
              class="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div class="w-full h-40 flex items-end">
                <div
                  class="w-full bg-brand-500 rounded-t-sm transition-all"
                  :style="{ height: barHeight(point.count, orderChart) }"
                  :title="`${formatChartLabel(point.date)}: ${point.count}`"
                />
              </div>
              <span class="text-[10px] text-gray-400 truncate w-full text-center">
                {{ formatChartLabel(point.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
