<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, X } from 'lucide-vue-next'
import { useAnalyticsStore } from '@/stores/analytics.store'

const { t, locale } = useI18n()
// locale untuk tanggal/angka mengikuti bahasa aktif
const dateLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'id-ID'))

// ===== FILTER BULAN =====
const selectedMonth = ref('all')

// ===== FILTER RENTANG TANGGAL (custom) — menang atas dropdown bulan =====
const dateFrom = ref('')
const dateTo = ref('')

// Rentang custom aktif hanya kalau kedua tanggal sudah diisi
const isCustomRange = computed(() => !!dateFrom.value && !!dateTo.value)

const monthOptions = computed(() => {
  const options = [{ value: 'all', label: t('admin.analytics.allMonths') }]
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(dateLocale.value, { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }

  return options
})

// Label rentang: "1 Jul 2026" dari string ISO "YYYY-MM-DD" (parse lokal, hindari geser hari)
const formatRangeLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Filter aktif terpusat: rentang tanggal custom menang, kalau tidak jatuh ke dropdown bulan.
// key dipakai sebagai kunci cache di store, params dikirim ke endpoint.
const activeFilter = computed(() => {
  if (isCustomRange.value) {
    // pastikan from <= to walau user membalik urutannya
    const [from, to] =
      dateFrom.value <= dateTo.value
        ? [dateFrom.value, dateTo.value]
        : [dateTo.value, dateFrom.value]
    return {
      key: `range:${from}:${to}`,
      params: { from, to, groupBy: 'day' },
      groupBy: 'day',
      periodLabel: `${formatRangeLabel(from)} – ${formatRangeLabel(to)}`,
    }
  }

  if (selectedMonth.value === 'all') {
    return { key: 'all', params: { groupBy: 'month' }, groupBy: 'month', periodLabel: t('admin.analytics.last12Months') }
  }

  const [year, month] = selectedMonth.value.split('-').map(Number)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  return {
    key: selectedMonth.value,
    params: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      groupBy: 'day',
    },
    groupBy: 'day',
    periodLabel: monthOptions.value.find((opt) => opt.value === selectedMonth.value)?.label || '',
  }
})

// Subtitle di kartu chart
const periodLabel = computed(() => activeFilter.value.periodLabel)
const isMonthly = computed(() => activeFilter.value.groupBy === 'month')
const visitorsChartTitle = computed(() =>
  isMonthly.value ? t('admin.analytics.visitorsMonthly') : t('admin.analytics.visitorsDaily')
)
const ordersChartTitle = computed(() =>
  isMonthly.value ? t('admin.analytics.ordersMonthly') : t('admin.analytics.ordersDaily')
)

// Ganti dropdown bulan → buang rentang custom biar tidak bentrok
const onMonthChange = () => {
  dateFrom.value = ''
  dateTo.value = ''
}

// Reset rentang custom → balik ke filter bulan
const clearRange = () => {
  dateFrom.value = ''
  dateTo.value = ''
}

// ===== STATE =====
// Data diambil dari cache store (stale-while-revalidate): kunjungan kedua
// dan seterusnya langsung tampil tanpa loading, refresh jalan di background.
const analyticsStore = useAnalyticsStore()
const errorMessage = ref('')

const dashboard = computed(() => analyticsStore.cache[activeFilter.value.key])
// Loading hanya saat belum ada cache untuk filter yang dipilih
const isLoading = computed(() => !dashboard.value && !errorMessage.value)

const visitorChart = computed(() => dashboard.value?.visitors ?? [])
const orderChart = computed(() => dashboard.value?.orders ?? [])

const statCards = computed(() => [
  { label: t('admin.analytics.totalVisitors'), value: dashboard.value?.totalVisitors ?? 0 },
  { label: t('admin.analytics.totalOrders'), value: dashboard.value?.totalOrders ?? 0 },
  { label: t('admin.analytics.totalProducts'), value: dashboard.value?.totalProducts ?? 0 },
  { label: t('admin.analytics.totalGalleryImages'), value: dashboard.value?.totalGalleryImages ?? 0 },
])

// ===== FETCH =====
const fetchDashboard = async () => {
  errorMessage.value = ''
  try {
    await analyticsStore.ensureLoaded(activeFilter.value.key, activeFilter.value.params)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('admin.analytics.loadFailed')
  }
}

onMounted(fetchDashboard)
// refetch tiap kali filter aktif berganti (dropdown bulan atau rentang tanggal)
watch(() => activeFilter.value.key, fetchDashboard)

// ===== CHART HELPERS =====
const formatChartLabel = (raw) => {
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)

  if (activeFilter.value.groupBy === 'month') {
    return date.toLocaleDateString(dateLocale.value, { month: 'short' })
  }

  return date.toLocaleDateString(dateLocale.value, { day: 'numeric' })
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
      <h1 class="text-4xl">{{ t('admin.analytics.title') }}</h1>

      <div class="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
        <!-- Dropdown bulan -->
        <div class="relative shrink-0 w-full sm:w-auto">
          <select
            v-model="selectedMonth"
            @change="onMonthChange"
            class="appearance-none w-full rounded-full border border-cream-300 bg-white pl-4 pr-10 py-2 text-sm font-semibold text-cocoa-500 focus:outline-none focus:border-brand-400 cursor-pointer"
          >
            <option v-for="opt in monthOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <ChevronDown
            class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>

        <!-- Rentang tanggal custom -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input
            v-model="dateFrom"
            type="date"
            :max="dateTo || undefined"
            :aria-label="t('admin.analytics.fromDate')"
            class="flex-1 sm:flex-none rounded-full border border-cream-300 bg-white px-4 py-2 text-sm font-semibold text-cocoa-500 focus:outline-none focus:border-brand-400 cursor-pointer"
          />
          <span class="text-cocoa-400 shrink-0">–</span>
          <input
            v-model="dateTo"
            type="date"
            :min="dateFrom || undefined"
            :aria-label="t('admin.analytics.toDate')"
            class="flex-1 sm:flex-none rounded-full border border-cream-300 bg-white px-4 py-2 text-sm font-semibold text-cocoa-500 focus:outline-none focus:border-brand-400 cursor-pointer"
          />
          <button
            v-if="isCustomRange"
            type="button"
            @click="clearRange"
            :aria-label="t('admin.analytics.clearRange')"
            class="shrink-0 p-1.5 rounded-full text-cocoa-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">
      {{ t('admin.analytics.loading') }}
    </div>

    <!-- ERROR -->
    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

    <template v-else>
      <!-- STAT CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] px-6 py-5"
        >
          <p class="text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-cocoa-400">
            {{ card.label }}
          </p>
          <p class="font-display text-4xl mt-2">{{ card.value.toLocaleString(dateLocale) }}</p>
        </div>
      </div>

      <!-- CHARTS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Visitors Chart -->
        <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] p-6">
          <div class="flex items-baseline justify-between gap-4 mb-8">
            <h2 class="text-xl">{{ visitorsChartTitle }}</h2>
            <span class="text-sm text-brand-400 font-semibold shrink-0">{{ periodLabel }}</span>
          </div>

          <div
            v-if="visitorChart.length === 0"
            class="h-52 flex items-center justify-center text-cocoa-400 text-sm border border-dashed border-cream-300 rounded-xl"
          >
            {{ t('admin.analytics.noData') }}
          </div>

          <div v-else class="h-52 flex items-end gap-1.5">
            <div
              v-for="(point, idx) in visitorChart"
              :key="idx"
              class="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div class="w-full h-40 flex flex-col items-center justify-end gap-1">
                <span class="text-[10px] font-semibold text-cocoa-500">{{ point.count }}</span>
                <div
                  class="w-full rounded-t-sm transition-all min-h-[4px]"
                  :class="idx === visitorChart.length - 1 ? 'bg-brand-600' : 'bg-[#eeb2ab]'"
                  :style="{ height: barHeight(point.count, visitorChart) }"
                  :title="`${formatChartLabel(point.date)}: ${point.count}`"
                />
              </div>
              <span class="text-[10px] text-cocoa-400 truncate w-full text-center">
                {{ formatChartLabel(point.date) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Orders Chart -->
        <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] p-6">
          <div class="flex items-baseline justify-between gap-4 mb-8">
            <h2 class="text-xl">{{ ordersChartTitle }}</h2>
            <span class="text-sm text-brand-400 font-semibold shrink-0">{{ periodLabel }}</span>
          </div>

          <div
            v-if="orderChart.length === 0"
            class="h-52 flex items-center justify-center text-cocoa-400 text-sm border border-dashed border-cream-300 rounded-xl"
          >
            {{ t('admin.analytics.noData') }}
          </div>

          <div v-else class="h-52 flex items-end gap-1.5">
            <div
              v-for="(point, idx) in orderChart"
              :key="idx"
              class="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div class="w-full h-40 flex flex-col items-center justify-end gap-1">
                <span class="text-[10px] font-semibold text-cocoa-500">{{ point.count }}</span>
                <div
                  class="w-full rounded-t-sm transition-all min-h-[4px]"
                  :class="idx === orderChart.length - 1 ? 'bg-[#a9803f]' : 'bg-[#ecc98d]'"
                  :style="{ height: barHeight(point.count, orderChart) }"
                  :title="`${formatChartLabel(point.date)}: ${point.count}`"
                />
              </div>
              <span class="text-[10px] text-cocoa-400 truncate w-full text-center">
                {{ formatChartLabel(point.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
