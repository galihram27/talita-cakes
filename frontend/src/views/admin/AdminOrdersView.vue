<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, ChevronDown } from 'lucide-vue-next'
import { useAdminOrdersStore } from '@/stores/adminOrders.store'
import { formatRupiah } from '@/utils/formatCurrency'
import Toast from '@/components/common/Toast.vue'

const { t, locale } = useI18n()
const adminOrdersStore = useAdminOrdersStore()

const errorMessage = ref('')
const searchQuery = ref('')
const selectedStatus = ref('ALL')
const toastMessage = ref('')
const statusError = ref('')

// Daftar status pesanan ditulis satu kali di sini, lalu dipakai ulang untuk
// isi dropdown filter maupun dropdown ubah status di tiap kartu pesanan.
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

// Pilihan filter = "semua status" ditambah keempat status di atas. Pakai
// computed supaya tulisannya ikut berganti saat bahasa diubah.
const STATUS_FILTER_OPTIONS = computed(() => [
  { value: 'ALL', label: t('admin.orders.allStatuses') },
  ...ORDER_STATUSES.map((status) => ({
    value: status,
    label: t(`admin.orders.status.${status}`),
  })),
])

// Warna label tiap status. Disimpan sebagai objek supaya di template cukup
// memanggil statusClass(status) tanpa menulis if/else berulang.
const STATUS_CLASSES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const statusClass = (status) => STATUS_CLASSES[status] || 'bg-cream-100 text-cocoa-500'

const isLoading = computed(() => !adminOrdersStore.hasLoaded && !errorMessage.value)

onMounted(async () => {
  try {
    await adminOrdersStore.ensureLoaded()
  } catch (err) {
    errorMessage.value = err.response?.data?.message || t('admin.orders.loadFailed')
  }
})

// Menyaring pesanan sesuai isi kotak pencarian dan filter status. Penyaringan
// dilakukan di browser dari data yang sudah diambil, jadi hasilnya langsung
// berubah saat mengetik tanpa perlu memanggil server lagi.
const filteredOrders = computed(() => {
  // Kata kunci dan data dibandingkan dalam huruf kecil semua supaya
  // pencarian tidak terpengaruh besar kecilnya huruf.
  const keyword = searchQuery.value.trim().toLowerCase()

  return adminOrdersStore.orders.filter((order) => {
    // Cek status dulu karena paling murah; kalau tidak cocok langsung dibuang.
    const matchesStatus = selectedStatus.value === 'ALL' || order.status === selectedStatus.value
    if (!matchesStatus) return false

    // Kotak pencarian kosong berarti semua pesanan lolos.
    if (!keyword) return true

    // Pesanan dianggap cocok kalau kata kunci ada di data pemesan
    // (nama/email/HP) atau di salah satu nama produk yang dipesan.
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

// Menyimpan id pesanan yang statusnya sedang diubah. Karena pesanannya banyak,
// yang dikunci cukup dropdown milik pesanan itu saja, bukan semuanya.
const updatingOrderId = ref(null)

const handleStatusChange = async (order, event) => {
  const nextStatus = event.target.value

  // Kalau admin memilih status yang sama, tidak perlu menghubungi server.
  if (nextStatus === order.status) return

  statusError.value = ''
  updatingOrderId.value = order.id

  try {
    await adminOrdersStore.updateStatus(order.id, nextStatus)
    toastMessage.value = t('admin.orders.statusUpdated', {
      status: t(`admin.orders.status.${nextStatus}`),
    })
  } catch (err) {
    statusError.value = err.response?.data?.message || t('admin.orders.statusUpdateFailed')
  } finally {
    updatingOrderId.value = null
  }
}

// Mengubah tanggal dari server jadi tulisan yang enak dibaca, mengikuti
// bahasa yang sedang dipakai (contoh: 27 Juli 2026 / July 27, 2026).
const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
</script>

<template>
  <div>
    <h1 class="text-4xl mb-8">{{ t('admin.orders.title') }}</h1>

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
      <div class="relative shrink-0">
        <select
          v-model="selectedStatus"
          :aria-label="t('admin.orders.filterStatus')"
          class="appearance-none w-full rounded-full border border-cream-300 bg-white pl-4 pr-10 py-2.5 text-sm font-semibold text-cocoa-500 focus:outline-none focus:border-brand-400 cursor-pointer"
        >
          <option v-for="opt in STATUS_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <ChevronDown
          class="w-4 h-4 text-cocoa-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>

      <p class="text-sm font-semibold text-cocoa-400 shrink-0">
        {{ t('admin.orders.orderCount', { count: filteredOrders.length }) }}
      </p>
    </div>

    <!-- Empat kemungkinan tampilan, dipilih berurutan lewat v-if/v-else-if:
         sedang memuat, gagal memuat, tidak ada hasil, atau daftar pesanan. -->
    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">
      {{ t('admin.orders.loading') }}
    </div>

    <div v-else-if="errorMessage" class="text-center text-brand-600 py-24">
      {{ errorMessage }}
    </div>

    <div
      v-else-if="filteredOrders.length === 0"
      class="text-center text-cocoa-400 py-24 bg-white rounded-2xl border border-dashed border-cream-300"
    >
      <!-- Pesannya dibedakan: kalau filter sedang aktif berarti "tidak ada yang
           cocok", kalau tidak berarti memang belum ada pesanan sama sekali. -->
      {{
        searchQuery || selectedStatus !== 'ALL'
          ? t('admin.orders.noMatch')
          : t('admin.orders.empty')
      }}
    </div>

    <template v-else>
      <p v-if="statusError" class="text-sm text-brand-600 mb-4">{{ statusError }}</p>

      <div class="space-y-5">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(51,38,31,0.12)] p-6"
        >
          <div class="flex items-center justify-between gap-4 mb-4">
            <div class="min-w-0">
              <p class="text-sm text-cocoa-400">{{ formatDate(order.createdAt) }}</p>
              <p v-if="order.user" class="text-sm font-bold text-cocoa-900 truncate">
                {{ order.user.name }}
                <span class="font-normal text-cocoa-400">· {{ order.user.phone }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="rounded-full px-4 py-1 text-xs font-bold"
                :class="
                  order.fulfillmentType === 'DELIVERY'
                    ? 'bg-brand-100 text-brand-600'
                    : 'bg-cream-100 text-cocoa-500'
                "
              >
                {{
                  order.fulfillmentType === 'DELIVERY'
                    ? t('admin.orders.delivery')
                    : t('admin.orders.pickup')
                }}
              </span>

              <!-- Dropdown ubah status. Pakai :value + @change, bukan v-model,
                   supaya tampilan tidak terlanjur berubah sebelum server
                   memastikan perubahannya berhasil disimpan. -->
              <div class="relative">
                <select
                  :value="order.status"
                  :disabled="updatingOrderId === order.id"
                  @change="handleStatusChange(order, $event)"
                  :aria-label="t('admin.orders.statusAria')"
                  class="appearance-none cursor-pointer rounded-full pl-4 pr-9 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60 disabled:cursor-wait"
                  :class="statusClass(order.status)"
                >
                  <option v-for="status in ORDER_STATUSES" :key="status" :value="status">
                    {{ t(`admin.orders.status.${status}`) }}
                  </option>
                </select>
                <ChevronDown
                  class="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70"
                />
              </div>
            </div>
          </div>

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
    </template>

    <Toast v-model:message="toastMessage" />
  </div>
</template>
