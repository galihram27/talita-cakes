<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MapPin, Phone, LocateFixed, Route, Search, Loader2, ArrowLeft } from 'lucide-vue-next'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import markImageUrl from '@/assets/images/pin-21504.png'
import api from '@/lib/api'
import { useCartStore } from '@/stores/cart.store'
import { useAuthStore } from '@/stores/auth.store'
import { formatRupiah } from '@/utils/formatCurrency'
import { searchAddress, reverseGeocode as reverseGeocodeApi } from '@/utils/geocode'
import OrderConfirmModal from '@/components/checkout/OrderConfirmModal.vue'
import {
  DELIVERY_FEE_TIERS,
  MAX_DELIVERY_DISTANCE_KM,
  STORE_INFO,
  deliveryTierIndex,
} from '@/config/constants'

const { t } = useI18n()
const cartStore = useCartStore()
const authStore = useAuthStore()

// Tampilan peta diambil dari MapTiler kalau kuncinya tersedia. Kalau tidak,
// dipakai peta gratis OpenFreeMap sebagai cadangan supaya petanya tetap muncul.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || ''
const MAP_STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : 'https://tiles.openfreemap.org/styles/liberty'

// Penanda peta dibuat pakai perintah DOM biasa, bukan template Vue, karena
// maplibre meminta elemen HTML asli, bukan komponen.
const createDestMarkerEl = () => {
  const img = document.createElement('img')
  img.src = markImageUrl
  img.width = 48
  img.height = 48
  img.alt = ''
  img.draggable = false
  return img
}

const createStoreMarkerEl = () => {
  const el = document.createElement('div')
  el.className = 'store-marker'
  el.innerHTML = `
    <div class="store-pin">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    </div>`
  return el
}

// Titik toko, dipakai sebagai penanda di peta sekaligus patokan awal
// pencarian alamat agar hasilnya condong ke wilayah sekitar toko.
const STORE_LOCATION = { lat: -6.398744125589499, lng: 106.85493737965412 }
const DEFAULT_MAP_CENTER = STORE_LOCATION

const router = useRouter()

// Dua pilihan utama yang menentukan isian mana saja yang perlu muncul:
// ambil sendiri atau diantar, dan pesanan untuk diri sendiri atau orang lain.
const fulfillmentType = ref('PICKUP')
const recipientType = ref('FOR_MYSELF')
const recipientName = ref('')
const recipientPhone = ref('')
const recipientDataConsent = ref(false)
const address = ref('')
const addressLat = ref(null)
const addressLng = ref(null)
const requestCakeDate = ref('')
const includeEmail = ref(false)

const cart = ref({ items: [...cartStore.items], subtotal: cartStore.subtotal })
const deliveryFee = ref(null)
const distanceKm = ref(null)
const isLoading = ref(!cartStore.loaded)
const isLocating = ref(false)
const isReverseGeocoding = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const pinError = ref('')
const deliveryError = ref('')

// Kue dibuat setelah dipesan, jadi tanggal paling awal yang boleh dipilih
// adalah 3 hari dari sekarang. setDate otomatis pindah bulan kalau perlu.
const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

const dateError = computed(() =>
  requestCakeDate.value && requestCakeDate.value < minDate.value
    ? t('checkout.dateTooEarly', { date: minDate.value })
    : ''
)

// Ongkos kirim dibagi per rentang jarak. Nilai ini hanya menentukan baris mana
// yang disorot di tabel ongkir; perhitungan biayanya tetap dilakukan server.
// -1 berarti tidak ada yang disorot (jarak belum diketahui atau terlalu jauh).
const activeTierIndex = computed(() => deliveryTierIndex(distanceKm.value))

const isDelivery = computed(() => fulfillmentType.value === 'DELIVERY')
const isForSomeoneElse = computed(() => recipientType.value === 'FOR_SOMEONE_ELSE')

const total = computed(() => cart.value.subtotal + (deliveryFee.value ?? 0))

// Menentukan boleh tidaknya tombol pesan ditekan. Syaratnya bertingkat:
// syarat dasar berlaku untuk semua, syarat alamat hanya untuk pengiriman, dan
// syarat data penerima hanya kalau pesanannya untuk orang lain.
const canSubmit = computed(() => {
  if (!requestCakeDate.value || cart.value.items.length === 0) return false
  if (requestCakeDate.value < minDate.value) return false

  // Ambil sendiri tidak butuh alamat, jadi sampai di sini sudah cukup.
  if (!isDelivery.value) return true

  // Untuk pengiriman, titik lokasi wajib ditandai di peta dan ongkos kirimnya
  // harus sudah berhasil dihitung server.
  if (!address.value || addressLat.value === null || addressLng.value === null) return false
  if (deliveryFee.value === null) return false
  if (isForSomeoneElse.value) {
    return (
      recipientName.value.trim().length > 0 &&
      recipientPhone.value.trim().length >= 8 &&
      recipientDataConsent.value
    )
  }
  return true
})

// map dan marker disimpan di variabel biasa, bukan ref, karena keduanya
// diurus sendiri oleh maplibre dan tidak perlu diawasi Vue.
const mapEl = ref(null)
let map = null
let marker = null

// Mengubah titik koordinat menjadi tulisan alamat, dipakai setelah pengunjung
// mengklik atau menggeser penanda di peta.
const reverseGeocode = async (lat, lng) => {
  isReverseGeocoding.value = true
  try {
    const found = await reverseGeocodeApi(lat, lng)
    if (found) {
      address.value = found
      pinError.value = ''
    }
  } catch {
  } finally {
    isReverseGeocoding.value = false
  }
}

// Satu-satunya tempat penanda lokasi dipindahkan. Dipanggil dari mana-mana
// (klik peta, hasil pencarian, tombol lokasi saya), jadi pilihannya dibuat
// lentur lewat dua saklar: pan (ikut geser tampilan peta) dan syncAddress
// (isi ulang kolom alamat dari koordinat).
const setPoint = (lat, lng, { pan = true, syncAddress = false } = {}) => {
  addressLat.value = lat
  addressLng.value = lng

  if (!map) return

  // Penanda dibuat sekali saja saat pertama dipakai; pemanggilan berikutnya
  // hanya memindahkannya. Bisa digeser sendiri oleh pengunjung, dan setelah
  // digeser alamatnya ikut diperbarui.
  if (!marker) {
    marker = new maplibregl.Marker({
      element: createDestMarkerEl(),
      anchor: 'bottom',
      draggable: true,
    })
      .setLngLat([lng, lat])
      .addTo(map)
    marker.on('dragend', () => {
      const pos = marker.getLngLat()
      addressLat.value = pos.lat
      addressLng.value = pos.lng
      reverseGeocode(pos.lat, pos.lng)
    })
  } else {
    marker.setLngLat([lng, lat])
  }
  if (pan) map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16) })
  if (syncAddress) reverseGeocode(lat, lng)
}

const suggestions = ref([])
const isSearching = ref(false)
const showSuggestions = ref(false)
const activeSuggestion = ref(-1)
const searchError = ref('')
const addressBoxEl = ref(null)

// Dua pengaman untuk pencarian alamat: timer supaya tidak mencari tiap ketikan,
// dan searchAbort untuk membatalkan pencarian lama yang belum selesai.
let searchDebounceTimer = null
let searchAbort = null

const closeSuggestions = () => {
  showSuggestions.value = false
  activeSuggestion.value = -1
}

// Pencarian lama dibatalkan lebih dulu. Tanpa ini, hasil pencarian yang lebih
// tua bisa datang belakangan dan menimpa hasil yang lebih baru.
const runSearch = async (query) => {
  searchAbort?.abort()
  const controller = new AbortController()
  searchAbort = controller

  isSearching.value = true
  searchError.value = ''
  try {
    const results = await searchAddress(query, {
      proximity: STORE_LOCATION,
      signal: controller.signal,
    })
    // Pemeriksaan terakhir: kalau sudah ada pencarian yang lebih baru,
    // hasil ini diabaikan saja.
    if (searchAbort !== controller) return

    suggestions.value = results
    showSuggestions.value = true
    activeSuggestion.value = -1
    if (results.length === 0) searchError.value = t('checkout.addressNotFound')
  } catch (err) {
    if (err.name === 'AbortError' || searchAbort !== controller) return
    suggestions.value = []
    searchError.value = t('checkout.addressSearchFailed')
  } finally {
    if (searchAbort === controller) isSearching.value = false
  }
}

const handleAddressInput = () => {
  clearTimeout(searchDebounceTimer)
  searchError.value = ''

  // Kurang dari 3 huruf tidak dicari, karena hasilnya pasti terlalu banyak
  // dan tidak membantu.
  const query = address.value.trim()
  if (query.length < 3) {
    suggestions.value = []
    closeSuggestions()
    return
  }

  searchDebounceTimer = setTimeout(() => runSearch(query), 500)
}

const selectSuggestion = (item) => {
  address.value = item.label
  setPoint(item.lat, item.lng, { pan: true, syncAddress: false })
  suggestions.value = []
  closeSuggestions()
}

// Daftar saran alamat bisa dijelajahi pakai tombol panah, dipilih dengan Enter,
// dan ditutup dengan Escape. e.preventDefault() menahan perilaku bawaan panah
// yang menggeser kursor di dalam kotak isian.
const handleAddressKeydown = (e) => {
  if (!showSuggestions.value || suggestions.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    // Sisa bagi (%) membuat sorotan kembali ke awal setelah sampai di bawah.
    activeSuggestion.value = (activeSuggestion.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeSuggestion.value =
      activeSuggestion.value <= 0 ? suggestions.value.length - 1 : activeSuggestion.value - 1
  } else if (e.key === 'Enter') {
    if (activeSuggestion.value >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions.value[activeSuggestion.value])
    }
  } else if (e.key === 'Escape') {
    closeSuggestions()
  }
}

const handlePointerDownOutside = (e) => {
  if (addressBoxEl.value && !addressBoxEl.value.contains(e.target)) closeSuggestions()
}

onMounted(() => document.addEventListener('pointerdown', handlePointerDownOutside))

// Bersih-bersih saat halaman ditinggalkan: pemantau klik dilepas, timer
// dimatikan, dan pencarian yang masih berjalan dibatalkan.
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDownOutside)
  clearTimeout(searchDebounceTimer)
  searchAbort?.abort()
})

const initMap = () => {
  // Pengaman agar peta tidak dibuat dua kali.
  if (map || !mapEl.value) return

  map = new maplibregl.Map({
    container: mapEl.value,
    style: MAP_STYLE_URL,
    center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat],
    zoom: 13,
    attributionControl: { compact: true },
  })

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  const storePopup = new maplibregl.Popup({ offset: 34, closeButton: false }).setHTML(
    `<strong>Talita's Cake</strong>${STORE_INFO.address ? `<br/>${STORE_INFO.address}` : ''}`
  )
  new maplibregl.Marker({ element: createStoreMarkerEl(), anchor: 'bottom' })
    .setLngLat([STORE_LOCATION.lng, STORE_LOCATION.lat])
    .setPopup(storePopup)
    .addTo(map)

  // Klik di peta menandai lokasi pengiriman. pan: false supaya tampilan peta
  // tidak ikut bergeser — mengganggu kalau pengunjung sedang mengatur titiknya.
  map.on('click', (e) => setPoint(e.lngLat.lat, e.lngLat.lng, { pan: false, syncAddress: true }))

  // Kalau lokasinya sudah pernah ditandai sebelum peta dibuat ulang
  // (misalnya setelah berpindah dari "ambil sendiri"), penandanya dipasang lagi.
  if (addressLat.value !== null && addressLng.value !== null) {
    setPoint(addressLat.value, addressLng.value)
  }
}

const destroyMap = () => {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
}

// Peta hanya dibuat saat pilihan "diantar" aktif, dan dibuang saat berpindah
// ke "ambil sendiri" supaya tidak memakan memori percuma. nextTick diperlukan
// karena kotak petanya baru ada di layar setelah tampilan selesai diperbarui.
watch(
  isDelivery,
  async (val) => {
    if (val) {
      await nextTick()
      initMap()
    } else {
      destroyMap()
    }
  },
  { immediate: true }
)

onBeforeUnmount(destroyMap)

const fetchCart = async () => {
  // Checkout tanpa isi keranjang tidak masuk akal, jadi dikembalikan ke
  // halaman keranjang. Dicek dua kali: dari data yang sudah ada, dan
  // sekali lagi setelah data terbaru diambil dari server.
  if (cartStore.loaded && cart.value.items.length === 0) {
    router.replace('/cart')
    return
  }

  try {
    const { data } = await api.get('/carts')
    cart.value = data.data
    cartStore.setFromItems(cart.value.items)
    if (!cart.value.items || cart.value.items.length === 0) {
      router.replace('/cart')
    }
  } catch (err) {
    if (!cartStore.loaded) {
      errorMessage.value = err.response?.data?.message || t('cart.loadFailed')
    }
  } finally {
    isLoading.value = false
  }
}

// Mengambil lokasi pengunjung lewat GPS/browser. Bisa gagal karena browsernya
// tidak mendukung, atau karena izin lokasinya ditolak — keduanya dibedakan
// supaya pesan yang muncul sesuai keadaan.
const useMyLocation = () => {
  if (!('geolocation' in navigator)) {
    pinError.value = t('checkout.geoUnsupported')
    return
  }

  isLocating.value = true
  pinError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords
      setPoint(latitude, longitude, { syncAddress: true })
      isLocating.value = false
    },
    (err) => {
      isLocating.value = false
      pinError.value =
        err.code === err.PERMISSION_DENIED ? t('checkout.geoDenied') : t('checkout.geoFailed')
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

// Menyusun data yang dikirim ke server. Tanda ...( && ) membuat sekelompok
// data hanya ikut terkirim kalau syaratnya terpenuhi — data alamat hanya ikut
// saat diantar, dan data penerima hanya saat pesanan untuk orang lain.
const buildPayload = () => ({
  fulfillmentType: fulfillmentType.value,
  requestCakeDate: requestCakeDate.value,
  includeEmail: includeEmail.value,
  ...(isDelivery.value && {
    recipientType: recipientType.value,
    address: address.value,
    addressLat: addressLat.value,
    addressLng: addressLng.value,
    ...(isForSomeoneElse.value && {
      recipientName: recipientName.value,
      recipientPhone: recipientPhone.value,
      recipientDataConsent: recipientDataConsent.value,
    }),
  }),
})

// Menanyakan ongkos kirim dan jarak ke server. Perhitungannya sengaja
// dilakukan di server, bukan di browser, supaya tarifnya tidak bisa diakali
// dari sisi pengunjung.
const fetchPreview = async () => {
  if (isDelivery.value && (addressLat.value === null || addressLng.value === null)) return

  try {
    const { data } = await api.post('/orders/preview', {
      fulfillmentType: fulfillmentType.value,
      ...(isDelivery.value && {
        addressLat: addressLat.value,
        addressLng: addressLng.value,
      }),
    })
    deliveryFee.value = data.data.deliveryFee
    distanceKm.value = data.data.distanceKm
    deliveryError.value = ''
  } catch (err) {
    deliveryFee.value = null
    distanceKm.value = null

    // Hanya pesan yang memang untuk dibaca pengunjung yang ditampilkan
    // (misalnya "di luar jangkauan pengiriman"). Balasan yang berisi details
    // adalah kesalahan teknis, jadi tidak perlu ditunjukkan.
    const res = err.response?.data
    deliveryError.value = res && !res.details && res.message ? res.message : ''
  }
}

watch(isDelivery, () => {
  deliveryError.value = ''
})

// Ongkos kirim dihitung ulang setiap kali cara pengambilan atau titik lokasinya
// berubah. Ambil sendiri berarti ongkirnya 0. Untuk pengiriman, nilainya
// dikosongkan dulu supaya tidak sempat terlihat angka ongkir dari lokasi lama.
watch([fulfillmentType, addressLat, addressLng], () => {
  if (!isDelivery.value) {
    deliveryFee.value = 0
    distanceKm.value = null
    return
  }
  deliveryFee.value = null
  fetchPreview()
})

// Pesanan tidak langsung dikirim saat tombol ditekan. Isinya ditampilkan dulu
// di jendela konfirmasi supaya pembeli bisa memeriksa ulang sebelum lanjut.
const isConfirmOpen = ref(false)

const confirmDetails = computed(() => ({
  requestCakeDate: requestCakeDate.value,
  fulfillmentType: fulfillmentType.value,
  recipientType: recipientType.value,
  recipientName: recipientName.value,
  recipientPhone: recipientPhone.value,
  address: address.value,
  distanceKm: isDelivery.value ? distanceKm.value : null,
  items: cart.value.items,
  subtotal: cart.value.subtotal,
  deliveryFee: deliveryFee.value,
  total: total.value,
  includeEmail: includeEmail.value,
  email: authStore.user?.email ?? '',
}))

const openConfirm = () => {
  errorMessage.value = ''
  isConfirmOpen.value = true
}

const submitOrder = async () => {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post('/orders/confirm', buildPayload())
    const { order, whatsappLink } = data.data

    // Keranjang dikosongkan karena isinya sudah menjadi pesanan.
    cartStore.reset()

    // Pindah ke halaman berhasil dulu, baru buka WhatsApp. Urutannya penting:
    // kalau pembeli menekan tombol kembali dari WhatsApp, yang ditemuinya
    // halaman berhasil, bukan form checkout yang sudah tidak berlaku.
    await router.push({
      name: 'order-success',
      state: { whatsappLink, orderId: order?.id ?? '' },
    })

    window.location.href = whatsappLink
  } catch (err) {
    // Server bisa membalas kesalahan per kolom isian. Semuanya dikumpulkan
    // jadi satu kalimat supaya pembeli tahu bagian mana yang bermasalah.
    const details = err.response?.data?.details
    const fieldMessages = details
      ? [...(details.formErrors ?? []), ...Object.values(details.fieldErrors ?? {}).flat()]
      : []

    errorMessage.value =
      fieldMessages.length > 0
        ? fieldMessages.join(' — ')
        : err.response?.data?.message || t('checkout.createFailed')

    isConfirmOpen.value = false
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchCart)
</script>

<template>
  <div class="tc-page max-w-[1100px] mx-auto px-5 md:px-8 pt-10 pb-20">
    <RouterLink
      to="/cart"
      class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6E5A4D] hover:text-brand-500 mb-4 transition-colors"
    >
      <ArrowLeft class="w-4 h-4" stroke-width="2" />
      {{ t('checkout.backToCart') }}
    </RouterLink>
    <h1 class="font-display text-[38px] mb-1">{{ t('checkout.title') }}</h1>
    <p class="text-[#6E5A4D] text-[15px] mb-7">
      {{ t('checkout.subtitle') }}
    </p>

    <div v-if="isLoading" class="text-center text-cocoa-400 py-24">
      {{ t('checkout.loading') }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
      <div class="flex flex-col gap-5">
        <section class="bg-white border border-cream-300 rounded-2xl p-6">
          <div class="flex items-center gap-3 mb-3.5">
            <span
              class="w-[30px] h-[30px] rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-sm"
            >
              1
            </span>
            <span class="font-display text-xl">{{ t('checkout.dateTitle') }}</span>
          </div>
          <p class="text-[13.5px] text-cocoa-400 mb-3">
            {{ t('checkout.dateHint1') }}
            <strong class="text-cocoa-900">{{ minDate }}</strong> {{ t('checkout.dateHint2') }}
          </p>
          <p class="text-[13.5px] text-cocoa-400 mb-3">
            {{ t('checkout.dateHint3') }} {{ t('checkout.dateHintChat') }}
            <a
              v-if="STORE_INFO.whatsappNumber"
              :href="`https://wa.me/${STORE_INFO.whatsappNumber}`"
              target="_blank"
              rel="noopener"
              class="font-extrabold text-[#3E7A4E] underline"
            >
              {{ t('checkout.dateHintWhatsApp') }}
            </a>
          </p>
          <input
            v-model="requestCakeDate"
            type="date"
            :min="minDate"
            class="w-full max-w-[280px] rounded-xl border-[1.5px] bg-white px-4 py-3 text-[15px] text-cocoa-900"
            :class="dateError ? 'border-brand-500' : 'border-[#E4D3C1]'"
          />
          <p v-if="dateError" class="text-[13px] text-brand-500 font-bold mt-2">
            {{ dateError }}
          </p>
        </section>

        <section class="bg-white border border-cream-300 rounded-2xl p-6">
          <div class="flex items-center gap-3 mb-3.5">
            <span
              class="w-[30px] h-[30px] rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-sm"
            >
              2
            </span>
            <span class="font-display text-xl">{{ t('checkout.fulfillTitle') }}</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="fulfillmentType = 'PICKUP'"
              class="rounded-[14px] border-2 px-4 py-4 text-left transition-colors"
              :class="
                fulfillmentType === 'PICKUP'
                  ? 'border-brand-500 bg-[#F4D6D1]'
                  : 'border-[#EBDCCC] bg-white hover:border-brand-500'
              "
            >
              <div class="text-[22px] mb-1.5">🏠</div>
              <div class="font-extrabold text-[15px] text-cocoa-900">
                {{ t('checkout.pickup') }}
              </div>
              <div class="text-[12.5px] text-cocoa-400 mt-0.5">
                {{ t('checkout.pickupDesc') }}
              </div>
            </button>
            <button
              type="button"
              @click="fulfillmentType = 'DELIVERY'"
              class="rounded-[14px] border-2 px-4 py-4 text-left transition-colors"
              :class="
                fulfillmentType === 'DELIVERY'
                  ? 'border-brand-500 bg-[#F4D6D1]'
                  : 'border-[#EBDCCC] bg-white hover:border-brand-500'
              "
            >
              <div class="text-[22px] mb-1.5">🛵</div>
              <div class="font-extrabold text-[15px] text-cocoa-900">
                {{ t('checkout.delivery') }}
              </div>
              <div class="text-[12.5px] text-cocoa-400 mt-0.5">
                {{ t('checkout.deliveryDesc', { km: MAX_DELIVERY_DISTANCE_KM }) }}
              </div>
            </button>
          </div>
          <div
            v-if="!isDelivery && STORE_INFO.address"
            class="mt-3.5 bg-cream-50 border border-cream-300 rounded-xl px-4 py-3 text-[13.5px] text-[#6E5A4D]"
          >
            {{ t('checkout.pickupAt') }}
            <strong class="text-cocoa-900">{{ STORE_INFO.address }}</strong>
          </div>
        </section>

        <!-- Bagian penerima, hanya muncul kalau pesanannya diantar. Kalau untuk
             orang lain, nama dan nomor penerimanya perlu diisi beserta
             persetujuan pemakaian datanya. -->
        <section v-if="isDelivery" class="bg-white border border-cream-300 rounded-2xl p-6">
          <div class="flex items-center gap-3 mb-3.5">
            <span
              class="w-[30px] h-[30px] rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-sm"
            >
              3
            </span>
            <span class="font-display text-xl">{{ t('checkout.recipientTitle') }}</span>
          </div>
          <div class="flex gap-2.5 mb-4">
            <button
              type="button"
              @click="recipientType = 'FOR_MYSELF'"
              class="flex-1 rounded-xl border-2 py-3 font-extrabold text-sm text-cocoa-900 transition-colors"
              :class="
                recipientType === 'FOR_MYSELF'
                  ? 'border-brand-500 bg-[#F4D6D1]'
                  : 'border-[#EBDCCC] bg-white hover:border-brand-500'
              "
            >
              {{ t('checkout.forMyself') }}
            </button>
            <button
              type="button"
              @click="recipientType = 'FOR_SOMEONE_ELSE'"
              class="flex-1 rounded-xl border-2 py-3 font-extrabold text-sm text-cocoa-900 transition-colors"
              :class="
                recipientType === 'FOR_SOMEONE_ELSE'
                  ? 'border-brand-500 bg-[#F4D6D1]'
                  : 'border-[#EBDCCC] bg-white hover:border-brand-500'
              "
            >
              {{ t('checkout.forSomeoneElse') }}
            </button>
          </div>

          <div v-if="isForSomeoneElse" class="flex flex-col gap-3">
            <input
              v-model="recipientName"
              type="text"
              :placeholder="t('checkout.recipientNamePlaceholder')"
              class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
            />
            <div class="relative">
              <Phone class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-400" />
              <input
                v-model="recipientPhone"
                type="tel"
                :placeholder="t('checkout.recipientPhonePlaceholder')"
                class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white pl-10 pr-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
              />
            </div>
            <label
              class="flex items-start gap-2.5 text-[13px] text-[#6E5A4D] leading-relaxed cursor-pointer"
            >
              <input
                v-model="recipientDataConsent"
                type="checkbox"
                class="mt-0.5 w-4 h-4 accent-brand-500"
              />
              {{ t('checkout.consent') }}
            </label>
          </div>
        </section>

        <section v-if="isDelivery" class="bg-white border border-cream-300 rounded-2xl p-6">
          <div class="flex items-center gap-3 mb-1.5">
            <span
              class="w-[30px] h-[30px] rounded-full bg-brand-500 text-white flex items-center justify-center font-extrabold text-sm"
            >
              4
            </span>
            <span class="font-display text-xl">{{ t('checkout.addressTitle') }}</span>
          </div>
          <p class="text-[13.5px] text-cocoa-400 mb-3.5">
            {{ t('checkout.addressHint') }}
          </p>

          <button
            type="button"
            :disabled="isLocating"
            @click="useMyLocation"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white px-5 py-3 text-sm font-extrabold hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            <LocateFixed class="w-4 h-4" />
            {{ isLocating ? t('checkout.locating') : t('checkout.useMyLocation') }}
          </button>

          <p v-if="pinError" class="text-xs text-brand-600 mt-2">{{ pinError }}</p>

          <!-- Kotak pencarian alamat beserta daftar sarannya. ref di sini
               dipakai untuk mengenali klik di luar area, agar daftar sarannya
               ikut tertutup. role="combobox" memberitahu pembaca layar bahwa
               ini kotak isian yang punya daftar pilihan. -->
          <div ref="addressBoxEl" class="relative mt-3.5">
            <MapPin class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-400" />
            <input
              v-model="address"
              @input="handleAddressInput"
              @keydown="handleAddressKeydown"
              @focus="suggestions.length && (showSuggestions = true)"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="showSuggestions"
              :placeholder="t('checkout.addressPlaceholder')"
              class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white pl-10 pr-10 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
            />
            <Loader2
              v-if="isSearching"
              class="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-cocoa-400 animate-spin"
            />
            <Search
              v-else
              class="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-cocoa-400"
            />

            <ul
              v-if="showSuggestions && suggestions.length > 0"
              class="absolute z-20 left-0 right-0 top-full mt-1.5 bg-white border border-cream-300 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
            >
              <!-- @mouseenter menyamakan sorotan mouse dengan sorotan tombol
                   panah, jadi keduanya memakai penanda yang sama. -->
              <li
                v-for="(item, i) in suggestions"
                :key="item.id"
                @click="selectSuggestion(item)"
                @mouseenter="activeSuggestion = i"
                class="flex items-start gap-2.5 px-4 py-2.5 text-[13.5px] leading-snug cursor-pointer border-b border-[#F6EDE2] last:border-b-0"
                :class="i === activeSuggestion ? 'bg-[#F4D6D1]' : 'hover:bg-cream-50'"
              >
                <MapPin class="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-500" />
                <span class="text-cocoa-900">{{ item.label }}</span>
              </li>
            </ul>
          </div>

          <p v-if="searchError" class="text-xs text-cocoa-400 mt-2">{{ searchError }}</p>

          <div
            class="mt-3.5 rounded-[14px] border border-cream-300 overflow-hidden h-[320px] relative z-0 bg-[#F0E3D6]"
          >
            <!-- Kotak kosong tempat maplibre menggambar petanya sendiri.
                 Isinya tidak diurus Vue, hanya wadahnya yang disediakan. -->
            <div ref="mapEl" class="w-full h-full"></div>
          </div>

          <p class="text-xs text-cocoa-400 mt-2">
            <template v-if="isReverseGeocoding">
              {{ t('checkout.fetchingAddress') }}
            </template>
            <template v-else-if="addressLat === null">
              {{ t('checkout.mapHintNoPin') }}
            </template>
            <template v-else>
              {{ t('checkout.mapHintHasPin') }}
            </template>
          </p>

          <div
            v-if="distanceKm !== null"
            class="mt-3 flex items-center gap-3 rounded-xl border border-[#CDE3D2] bg-[#EDF6EF] px-4 py-3"
          >
            <div
              class="w-10 h-10 rounded-full bg-[#3E7A4E] flex items-center justify-center shrink-0"
            >
              <Route class="w-5 h-5 text-white" />
            </div>
            <div>
              <div class="text-[11px] font-extrabold tracking-widest uppercase text-[#3E7A4E]">
                {{ t('checkout.distanceLabel') }}
              </div>
              <div class="text-lg font-extrabold leading-tight text-cocoa-900">
                ± {{ distanceKm.toFixed(1) }} km
              </div>
            </div>
            <span
              class="ml-auto text-[11px] font-bold text-[#3E7A4E] bg-white border border-[#CDE3D2] rounded-full px-2.5 py-1"
            >
              {{ t('checkout.inRange', { km: MAX_DELIVERY_DISTANCE_KM }) }}
            </span>
          </div>

          <div
            v-if="deliveryError"
            class="mt-3 rounded-xl border border-[#F0C9C4] bg-[#FBE9E7] p-4 text-xs text-brand-500 font-bold"
          >
            {{ deliveryError }}
            <a
              v-if="STORE_INFO.whatsappNumber"
              :href="`https://wa.me/${STORE_INFO.whatsappNumber}`"
              target="_blank"
              rel="noopener"
              class="font-extrabold underline"
            >
              {{ t('checkout.contactWhatsApp') }}
            </a>
          </div>

          <div class="mt-4">
            <div class="text-[13px] font-extrabold text-cocoa-400 tracking-widest uppercase mb-2">
              {{ t('checkout.feeTitle') }}
            </div>
            <!-- Tabel tarif ongkir. Baris yang sesuai jarak alamat pembeli
                 disorot hijau, jadi terlihat tarif mana yang sedang berlaku. -->
            <div class="flex flex-col border border-cream-300 rounded-xl overflow-hidden">
              <div
                v-for="(tier, i) in DELIVERY_FEE_TIERS"
                :key="tier.label"
                class="flex justify-between px-4 py-2.5 text-[13.5px] border-b border-[#F6EDE2] last:border-b-0 transition-colors"
                :class="
                  i === activeTierIndex ? 'bg-[#EDF6EF] text-[#3E7A4E] font-bold' : 'text-[#6E5A4D]'
                "
              >
                <span>{{ tier.label }}</span>
                <span
                  class="font-bold"
                  :class="i === activeTierIndex ? 'text-[#3E7A4E]' : 'text-cocoa-900'"
                >
                  {{ formatRupiah(tier.fee) }}
                </span>
              </div>
            </div>
            <p class="text-xs text-cocoa-400 mt-2">
              {{ t('checkout.feeNote', { km: MAX_DELIVERY_DISTANCE_KM }) }}
            </p>
          </div>
        </section>
      </div>

      <!-- Ringkasan pesanan. lg:sticky membuatnya ikut turun mengikuti gulir di
           layar lebar, jadi total dan tombol pesan selalu terlihat sementara
           pembeli mengisi form di sebelah kiri. -->
      <aside class="bg-white border border-cream-300 rounded-2xl p-6 lg:sticky lg:top-[92px]">
        <h2 class="font-display text-[21px] mb-4">{{ t('checkout.summaryTitle') }}</h2>

        <ul class="flex flex-col gap-3 mb-4">
          <li
            v-for="item in cart.items"
            :key="item.id"
            class="flex items-start justify-between gap-3 text-[13.5px]"
          >
            <span class="text-cocoa-900 font-bold leading-snug">
              {{ item.productName }}
              <span class="text-cocoa-400 font-semibold">×{{ item.quantity }}</span>
            </span>
            <span class="shrink-0 font-bold">
              {{ formatRupiah(item.lineTotal) }}
            </span>
          </li>
        </ul>

        <div class="border-t border-cream-200 pt-3.5">
          <div class="flex justify-between text-sm text-[#6E5A4D] py-1">
            <span>{{ t('checkout.subtotal') }}</span>
            <strong class="text-cocoa-900">{{ formatRupiah(cart.subtotal) }}</strong>
          </div>
          <!-- Baris ongkir punya tiga kemungkinan isi: nominalnya kalau sudah
               dihitung, "di luar jangkauan" kalau alamatnya terlalu jauh, atau
               ajakan menandai lokasi kalau titiknya belum dipilih. -->
          <div v-if="isDelivery" class="flex justify-between text-sm text-[#6E5A4D] py-1">
            <span>{{ t('checkout.shipping') }}</span>
            <strong :class="deliveryError ? 'text-brand-500' : 'text-cocoa-900'">
              <template v-if="deliveryFee !== null">
                {{ formatRupiah(deliveryFee) }}
              </template>
              <template v-else-if="deliveryError">{{ t('checkout.outOfRange') }}</template>
              <template v-else>{{ t('checkout.pinFirst') }}</template>
            </strong>
          </div>
          <div class="flex justify-between text-[17px] font-extrabold pt-3 pb-4">
            <span>{{ t('checkout.total') }}</span>
            <span class="text-brand-500">{{ formatRupiah(total) }}</span>
          </div>
        </div>

        <label
          class="flex items-start gap-2.5 rounded-xl bg-cream-50 border border-cream-300 p-4 mb-4 cursor-pointer"
        >
          <input v-model="includeEmail" type="checkbox" class="mt-0.5 w-4 h-4 accent-brand-500" />
          <span class="text-[13px] text-[#6E5A4D] leading-relaxed">
            {{ t('checkout.includeEmail') }}
            <strong v-if="authStore.user?.email" class="block mt-1 text-cocoa-900 break-all">
              {{ authStore.user.email }}
            </strong>
          </span>
        </label>

        <div class="rounded-xl bg-cream-50 border border-cream-300 p-4 mb-4">
          <h3 class="text-sm font-extrabold mb-2">{{ t('checkout.importantTitle') }}</h3>
          <ul class="text-xs text-[#6E5A4D] space-y-1 list-disc list-inside">
            <li>{{ t('checkout.important.i1') }}</li>
            <li>{{ t('checkout.important.i2') }}</li>
            <li>{{ t('checkout.important.i3') }}</li>
            <li>{{ t('checkout.important.i4') }}</li>
          </ul>
        </div>

        <div
          v-if="errorMessage"
          class="bg-[#FBE9E7] border border-[#F0C9C4] text-brand-500 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold mb-3"
        >
          {{ errorMessage }}
        </div>

        <!-- Tombol ini membuka jendela konfirmasi, bukan langsung mengirim
             pesanan. Dimatikan selama syarat di canSubmit belum terpenuhi. -->
        <button
          type="button"
          :disabled="!canSubmit || isSubmitting"
          @click="openConfirm"
          class="w-full bg-brand-500 text-white rounded-full py-[15px] font-extrabold text-[15.5px] hover:bg-brand-600 transition-colors disabled:opacity-40"
        >
          {{ isSubmitting ? t('checkout.submitting') : t('checkout.submit') }}
        </button>
        <p class="text-[12.5px] text-cocoa-400 text-center mt-3 leading-relaxed">
          {{ t('checkout.afterSave') }}
        </p>
      </aside>
    </div>

    <!-- Jendela konfirmasi terakhir. Pesanan baru benar-benar dikirim ke server
         setelah pembeli menyetujui isinya di sini. -->
    <OrderConfirmModal
      :open="isConfirmOpen"
      :is-submitting="isSubmitting"
      :details="confirmDetails"
      @confirm="submitOrder"
      @cancel="isConfirmOpen = false"
    />
  </div>
</template>

<style>
.store-marker .store-pin {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #c0392b;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
.store-marker .store-pin svg {
  width: 20px;
  height: 20px;
  transform: rotate(45deg);
}
</style>
