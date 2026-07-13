<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MapPin, Phone, LocateFixed, Route } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markImageUrl from '@/assets/images/pin-21504.png'
import api from '@/lib/api'
import { useCartStore } from '@/stores/cart.store'
import { useAuthStore } from '@/stores/auth.store'
import { formatRupiah } from '@/utils/formatCurrency'
import {
  DELIVERY_FEE_TIERS,
  MAX_DELIVERY_DISTANCE_KM,
  STORE_INFO,
} from '@/config/constants'

const { t } = useI18n()
const cartStore = useCartStore()
const authStore = useAuthStore()

// Icon marker custom (gambar pin sendiri, bukan icon default Leaflet).
// Gambarnya square; ujung pin ada di ~88% tinggi gambar -> anchor [24, 42].
const markerIcon = L.icon({
  iconUrl: markImageUrl,
  iconSize: [48, 48],
  iconAnchor: [24, 42],
})

// Penanda lokasi toko: pin bulat berisi ikon rumah (divIcon inline SVG, tidak
// perlu file gambar). Dibedakan dari marker tujuan user supaya jelas mana toko.
const storeIcon = L.divIcon({
  className: 'store-marker',
  html: `
    <div class="store-pin">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 38],
  popupAnchor: [0, -34],
})

// Lokasi toko (Sukamaju, Cilodong, Depok). Dipakai untuk pusat peta awal &
// penanda toko. Perhitungan jarak/ongkir tetap dilakukan backend dari
// STORE_LOCATION di env — nilai ini harus sinkron dengan STORE_LATITUDE/LONGITUDE.
const STORE_LOCATION = { lat: -6.398744125589499, lng: 106.85493737965412 }
const DEFAULT_MAP_CENTER = STORE_LOCATION

const router = useRouter()

// ===== FORM STATE =====
const fulfillmentType = ref('PICKUP') // 'PICKUP' | 'DELIVERY'
const recipientType = ref('FOR_MYSELF') // 'FOR_MYSELF' | 'FOR_SOMEONE_ELSE'
const recipientName = ref('')
const recipientPhone = ref('')
const recipientDataConsent = ref(false)
const address = ref('')
const addressLat = ref(null)
const addressLng = ref(null)
const requestCakeDate = ref('')
// opsional: user boleh memilih menyertakan emailnya di pesan WhatsApp.
// Dengan menyertakan email, user sekaligus setuju menerima promo/info menu.
const includeEmail = ref(false)

// ===== CART / SUMMARY STATE =====
// Seed dari cache store supaya ringkasan pesanan langsung tampil tanpa spinner.
const cart = ref({ items: [...cartStore.items], subtotal: cartStore.subtotal })
const deliveryFee = ref(null) // null = belum dihitung (butuh pin lokasi)
const distanceKm = ref(null)
const isLoading = ref(!cartStore.loaded)
const isLocating = ref(false)
const isReverseGeocoding = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const pinError = ref('')
// terisi kalau alamat di luar radius pengiriman (maks. 25 km)
const deliveryError = ref('')

// Batas minimal tanggal: H+7 dari hari ini (sinkron dengan validasi backend).
// Format manual pakai tanggal lokal — toISOString() memakai UTC sehingga
// sebelum jam 07:00 WIB batasnya mundur 1 hari dan ditolak backend.
const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

// Pesan error tanggal: tampil begitu user memilih tanggal lebih awal dari
// batas minimal (H+7). Input date bisa saja diisi manual sehingga atribut
// `min` tidak selalu mencegahnya — validasi ini memberi tahu user langsung.
const dateError = computed(() =>
  requestCakeDate.value && requestCakeDate.value < minDate.value
    ? t('checkout.dateTooEarly', { date: minDate.value })
    : ''
)

const isDelivery = computed(() => fulfillmentType.value === 'DELIVERY')
const isForSomeoneElse = computed(
  () => recipientType.value === 'FOR_SOMEONE_ELSE'
)

const total = computed(() => cart.value.subtotal + (deliveryFee.value ?? 0))

const canSubmit = computed(() => {
  if (!requestCakeDate.value || cart.value.items.length === 0) return false
  // atribut min pada input date tidak mencegah user mengetik tanggal manual
  if (requestCakeDate.value < minDate.value) return false
  if (!isDelivery.value) return true

  if (!address.value || addressLat.value === null || addressLng.value === null)
    return false
  // ongkir belum berhasil dihitung (masih loading / di luar radius layanan)
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

// ===== LEAFLET MAP =====
const mapEl = ref(null)
let map = null
let marker = null

// Reverse geocode: koordinat -> alamat teks (Nominatim / OpenStreetMap).
// Dipakai saat user klik peta / geser marker supaya field alamat terisi otomatis.
const reverseGeocode = async (lat, lng) => {
  isReverseGeocoding.value = true
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const result = await res.json()
    if (result?.display_name) {
      address.value = result.display_name
      pinError.value = ''
    }
  } catch {
    // gagal reverse geocode -> biarkan alamat apa adanya, titik tetap valid
  } finally {
    isReverseGeocoding.value = false
  }
}

// syncAddress: true = isi ulang field alamat dari titik (untuk aksi user di peta).
// false = jangan sentuh alamat (mis. saat memulihkan marker atau hasil Pin).
const setPoint = (lat, lng, { pan = true, syncAddress = false } = {}) => {
  addressLat.value = lat
  addressLng.value = lng

  if (!map) return
  if (!marker) {
    marker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map)
    // user geser marker -> titik lokasi ikut pindah + alamat ikut diperbarui
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      addressLat.value = pos.lat
      addressLng.value = pos.lng
      reverseGeocode(pos.lat, pos.lng)
    })
  } else {
    marker.setLatLng([lat, lng])
  }
  if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 16))
  if (syncAddress) reverseGeocode(lat, lng)
}

const initMap = () => {
  if (map || !mapEl.value) return

  map = L.map(mapEl.value).setView(
    [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
    13
  )

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  // Penanda toko (tetap, tidak bisa digeser). Beri popup nama/alamat toko.
  const storeMarker = L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], {
    icon: storeIcon,
    interactive: true,
    keyboard: false,
    zIndexOffset: -100, // di bawah marker tujuan user kalau bertumpuk
  }).addTo(map)
  storeMarker.bindPopup(
    `<strong>Talita's Cake</strong>${STORE_INFO.address ? `<br/>${STORE_INFO.address}` : ''}`
  )

  // user klik peta -> taruh/pindahkan marker + isi alamat otomatis
  map.on('click', (e) =>
    setPoint(e.latlng.lat, e.latlng.lng, { pan: false, syncAddress: true })
  )

  // kalau titik sudah ada (mis. balik dari PICKUP ke DELIVERY), pulihkan marker
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

// Section delivery pakai v-if, jadi peta harus di-init setiap section muncul
// dan dibersihkan saat disembunyikan (elemen container-nya ikut hilang).
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

// ===== FETCH CART (untuk Order Summary) =====
const fetchCart = async () => {
  // Kalau cache sudah ada isinya, tampilkan langsung dan refresh diam-diam.
  // (Kalau cache kosong tapi belum pernah load, biarkan spinner sampai server
  // menjawab — jangan buru-buru redirect ke /cart.)
  if (cartStore.loaded && cart.value.items.length === 0) {
    router.replace('/cart')
    return
  }

  try {
    const { data } = await api.get('/carts')
    cart.value = data.data
    cartStore.setFromItems(cart.value.items)
    if (!cart.value.items || cart.value.items.length === 0) {
      // tidak ada yang bisa di-checkout, balikin ke cart
      router.replace('/cart')
    }
  } catch (err) {
    if (!cartStore.loaded) {
      errorMessage.value =
        err.response?.data?.message || t('cart.loadFailed')
    }
  } finally {
    isLoading.value = false
  }
}

// ===== LOKASI SAYA: pakai GPS browser (Geolocation API) =====
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
      // taruh marker di lokasi user + isi alamat otomatis; user masih bisa
      // koreksi dengan menggeser marker atau klik titik lain di peta
      setPoint(latitude, longitude, { syncAddress: true })
      isLocating.value = false
    },
    (err) => {
      isLocating.value = false
      pinError.value =
        err.code === err.PERMISSION_DENIED
          ? t('checkout.geoDenied')
          : t('checkout.geoFailed')
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

// ===== PREVIEW: hitung ongkir + total di backend =====
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

const fetchPreview = async () => {
  // Preview (ongkir) hanya butuh titik lokasi — jarak/ongkir dihitung murni
  // dari koordinat, jadi ongkir langsung muncul saat pin ditaruh (GPS / klik
  // peta), tanpa menunggu tanggal dipilih ataupun reverse-geocode mengisi
  // field alamat.
  if (isDelivery.value && (addressLat.value === null || addressLng.value === null))
    return

  try {
    // JANGAN pakai buildPayload() di sini: field lain yang belum terisi
    // (recipientName/recipientPhone kosong, tanggal belum dipilih) akan
    // ditolak validasi backend (422) — ongkir jadi macet di "Pin lokasi dulu"
    // padahal titik sudah dipin. Preview cukup koordinat saja.
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
    // preview gagal (mis. validasi) -> biarkan ongkir tampil "dihitung nanti"
    deliveryFee.value = null
    distanceKm.value = null

    // error tanpa details = pesan bisnis dari backend (mis. di luar radius 25 km),
    // bukan error validasi field — tampilkan ke user
    const res = err.response?.data
    deliveryError.value = res && !res.details && res.message ? res.message : ''
  }
}

watch(isDelivery, () => {
  deliveryError.value = ''
})

watch([fulfillmentType, addressLat, addressLng], () => {
  if (!isDelivery.value) {
    deliveryFee.value = 0
    distanceKm.value = null
    return
  }
  deliveryFee.value = null
  fetchPreview()
})

// ===== CONFIRM: buat order + buka WhatsApp =====
const submitOrder = async () => {
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post('/orders/confirm', buildPayload())
    const { order, whatsappLink } = data.data

    // Cart sudah dikosongkan backend saat confirm — samakan cache lokal biar
    // badge Navbar langsung ikut kosong.
    cartStore.reset()

    // Taruh halaman sukses di history SEBELUM pindah ke WhatsApp, supaya saat
    // user menekan back dari WhatsApp mereka mendarat di halaman sukses
    // (bukan balik ke checkout dengan cart kosong). whatsappLink & orderId
    // dibawa via history.state agar halaman sukses bisa menampilkannya.
    await router.push({
      name: 'order-success',
      state: { whatsappLink, orderId: order?.id ?? '' },
    })

    // Navigasi di tab yang sama, bukan window.open: setelah await, browser
    // sudah tidak menganggapnya hasil klik user sehingga popup diblokir.
    window.location.href = whatsappLink
  } catch (err) {
    // Zod flatten dari backend: { formErrors: [], fieldErrors: { field: [pesan] } }
    const details = err.response?.data?.details
    const fieldMessages = details
      ? [
          ...(details.formErrors ?? []),
          ...Object.values(details.fieldErrors ?? {}).flat(),
        ]
      : []

    errorMessage.value =
      fieldMessages.length > 0
        ? fieldMessages.join(' — ')
        : err.response?.data?.message || t('checkout.createFailed')
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
      class="inline-flex items-center gap-1.5 text-cocoa-400 hover:text-brand-500 font-bold text-sm mb-4 transition-colors"
    >
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
      <!-- ===== KOLOM KIRI: FORM ===== -->
      <div class="flex flex-col gap-5">
        <!-- 1. Tanggal kue -->
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

        <!-- 2. Pickup / Delivery -->
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
              :class="fulfillmentType === 'PICKUP'
                ? 'border-brand-500 bg-[#F4D6D1]'
                : 'border-[#EBDCCC] bg-white hover:border-brand-500'"
            >
              <div class="text-[22px] mb-1.5">🏠</div>
              <div class="font-extrabold text-[15px] text-cocoa-900">{{ t('checkout.pickup') }}</div>
              <div class="text-[12.5px] text-cocoa-400 mt-0.5">
                {{ t('checkout.pickupDesc') }}
              </div>
            </button>
            <button
              type="button"
              @click="fulfillmentType = 'DELIVERY'"
              class="rounded-[14px] border-2 px-4 py-4 text-left transition-colors"
              :class="fulfillmentType === 'DELIVERY'
                ? 'border-brand-500 bg-[#F4D6D1]'
                : 'border-[#EBDCCC] bg-white hover:border-brand-500'"
            >
              <div class="text-[22px] mb-1.5">🛵</div>
              <div class="font-extrabold text-[15px] text-cocoa-900">{{ t('checkout.delivery') }}</div>
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

        <!-- 3. Penerima (hanya DELIVERY) -->
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
              :class="recipientType === 'FOR_MYSELF'
                ? 'border-brand-500 bg-[#F4D6D1]'
                : 'border-[#EBDCCC] bg-white hover:border-brand-500'"
            >
              {{ t('checkout.forMyself') }}
            </button>
            <button
              type="button"
              @click="recipientType = 'FOR_SOMEONE_ELSE'"
              class="flex-1 rounded-xl border-2 py-3 font-extrabold text-sm text-cocoa-900 transition-colors"
              :class="recipientType === 'FOR_SOMEONE_ELSE'
                ? 'border-brand-500 bg-[#F4D6D1]'
                : 'border-[#EBDCCC] bg-white hover:border-brand-500'"
            >
              {{ t('checkout.forSomeoneElse') }}
            </button>
          </div>

          <!-- Data penerima (khusus For Someone Else) -->
          <div v-if="isForSomeoneElse" class="flex flex-col gap-3">
            <input
              v-model="recipientName"
              type="text"
              :placeholder="t('checkout.recipientNamePlaceholder')"
              class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
            />
            <div class="relative">
              <Phone
                class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-400"
              />
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

        <!-- 4. Alamat tujuan (hanya DELIVERY) -->
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

          <!-- Alamat terisi otomatis dari titik lokasi; masih bisa disunting
               user untuk memperjelas (patokan, no. rumah, dsb). -->
          <div class="relative mt-3.5">
            <MapPin
              class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-400"
            />
            <input
              v-model="address"
              type="text"
              :placeholder="t('checkout.addressPlaceholder')"
              class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white pl-10 pr-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
            />
          </div>

          <!-- Peta interaktif (Leaflet + OpenStreetMap) -->
          <div
            class="mt-3.5 rounded-[14px] border border-cream-300 overflow-hidden h-[320px] relative z-0 bg-[#F0E3D6]"
          >
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

          <!-- Jarak dari toko — kotak tersendiri agar langsung terlihat user -->
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
              <div
                class="text-[11px] font-extrabold tracking-widest uppercase text-[#3E7A4E]"
              >
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

          <!-- Alamat di luar radius layanan pengiriman -->
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

          <!-- Info tarif ongkir -->
          <div class="mt-4">
            <div
              class="text-[13px] font-extrabold text-cocoa-400 tracking-widest uppercase mb-2"
            >
              {{ t('checkout.feeTitle') }}
            </div>
            <div class="flex flex-col border border-cream-300 rounded-xl overflow-hidden">
              <div
                v-for="tier in DELIVERY_FEE_TIERS"
                :key="tier.label"
                class="flex justify-between px-4 py-2.5 text-[13.5px] text-[#6E5A4D] border-b border-[#F6EDE2] last:border-b-0"
              >
                <span>{{ tier.label }}</span>
                <span class="font-bold text-cocoa-900">{{ formatRupiah(tier.fee) }}</span>
              </div>
            </div>
            <p class="text-xs text-cocoa-400 mt-2">
              {{ t('checkout.feeNote', { km: MAX_DELIVERY_DISTANCE_KM }) }}
            </p>
          </div>
        </section>
      </div>

      <!-- ===== KOLOM KANAN: RINGKASAN ===== -->
      <aside
        class="bg-white border border-cream-300 rounded-2xl p-6 lg:sticky lg:top-[92px]"
      >
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

        <!-- Sertakan email (opsional) -->
        <label
          class="flex items-start gap-2.5 rounded-xl bg-cream-50 border border-cream-300 p-4 mb-4 cursor-pointer"
        >
          <input
            v-model="includeEmail"
            type="checkbox"
            class="mt-0.5 w-4 h-4 accent-brand-500"
          />
          <span class="text-[13px] text-[#6E5A4D] leading-relaxed">
            {{ t('checkout.includeEmail') }}
            <strong
              v-if="authStore.user?.email"
              class="block mt-1 text-cocoa-900 break-all"
            >
              {{ authStore.user.email }}
            </strong>
          </span>
        </label>

        <!-- Important -->
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

        <button
          type="button"
          :disabled="!canSubmit || isSubmitting"
          @click="submitOrder"
          class="w-full bg-brand-500 text-white rounded-full py-[15px] font-extrabold text-[15.5px] hover:bg-brand-600 transition-colors disabled:opacity-40"
        >
          {{ isSubmitting ? t('checkout.submitting') : t('checkout.submit') }}
        </button>
        <p class="text-[12.5px] text-cocoa-400 text-center mt-3 leading-relaxed">
          {{ t('checkout.afterSave') }}
        </p>
      </aside>
    </div>
  </div>
</template>

<!-- Tidak scoped: elemen divIcon dibuat oleh Leaflet di luar pohon komponen,
     sehingga style scoped tidak akan mengenainya. Nama class dibuat unik. -->
<style>
.store-marker .store-pin {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #C0392B;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
.store-marker .store-pin svg {
  width: 20px;
  height: 20px;
  transform: rotate(45deg);
}
</style>
