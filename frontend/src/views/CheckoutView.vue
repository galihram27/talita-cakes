<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { MapPin, Phone } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markImageUrl from '@/assets/images/mark.jpg'
import api from '@/lib/api'
import { formatRupiah } from '@/utils/formatCurrency'

// Icon marker custom (gambar pin sendiri, bukan icon default Leaflet).
// Gambarnya square; ujung pin ada di ~88% tinggi gambar -> anchor [24, 42].
const markerIcon = L.icon({
  iconUrl: markImageUrl,
  iconSize: [48, 48],
  iconAnchor: [24, 42],
})

// Pusat peta awal: sekitar lokasi toko (Depok). Hanya untuk tampilan awal —
// perhitungan jarak tetap dilakukan backend dari STORE_LOCATION di env.
const DEFAULT_MAP_CENTER = { lat: -6.4025, lng: 106.7942 }

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

// ===== CART / SUMMARY STATE =====
const cart = ref({ items: [], subtotal: 0 })
const deliveryFee = ref(null) // null = belum dihitung (butuh pin lokasi)
const distanceKm = ref(null)
const isLoading = ref(true)
const isPinning = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const pinError = ref('')

// Batas minimal tanggal: H+7 dari hari ini (sinkron dengan validasi backend).
// Format manual pakai tanggal lokal — toISOString() memakai UTC sehingga
// sebelum jam 07:00 WIB batasnya mundur 1 hari dan ditolak backend.
const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

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

const setPoint = (lat, lng, { pan = true } = {}) => {
  addressLat.value = lat
  addressLng.value = lng

  if (!map) return
  if (!marker) {
    marker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map)
    // user geser marker -> titik lokasi ikut pindah
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      addressLat.value = pos.lat
      addressLng.value = pos.lng
    })
  } else {
    marker.setLatLng([lat, lng])
  }
  if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 16))
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

  // user klik peta -> taruh/pindahkan marker ke titik itu
  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng, { pan: false }))

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
  isLoading.value = true
  try {
    const { data } = await api.get('/carts')
    cart.value = data.data
    if (!cart.value.items || cart.value.items.length === 0) {
      // tidak ada yang bisa di-checkout, balikin ke cart
      router.replace('/cart')
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat keranjang'
  } finally {
    isLoading.value = false
  }
}

// ===== PIN: geocode alamat -> lat/lng (Nominatim / OpenStreetMap) =====
const pinAddress = async () => {
  if (!address.value.trim()) {
    pinError.value = 'Isi alamat lengkap terlebih dahulu'
    return
  }

  isPinning.value = true
  pinError.value = ''
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(address.value)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const results = await res.json()

    if (!results || results.length === 0) {
      pinError.value =
        'Alamat tidak ditemukan. Coba tulis lebih spesifik (nama jalan, kecamatan, kota).'
      return
    }

    // taruh marker di hasil geocoding; user masih bisa koreksi dengan
    // menggeser marker atau klik titik lain di peta
    setPoint(Number(results[0].lat), Number(results[0].lon))
  } catch {
    pinError.value = 'Gagal mencari lokasi, coba lagi'
  } finally {
    isPinning.value = false
  }
}

// ===== PREVIEW: hitung ongkir + total di backend =====
const buildPayload = () => ({
  fulfillmentType: fulfillmentType.value,
  requestCakeDate: requestCakeDate.value,
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
  // Preview butuh tanggal valid; untuk delivery juga butuh titik lokasi.
  if (!requestCakeDate.value) return
  if (isDelivery.value && (addressLat.value === null || addressLng.value === null))
    return

  try {
    const { data } = await api.post('/orders/preview', buildPayload())
    deliveryFee.value = data.data.deliveryFee
    distanceKm.value = data.data.distanceKm
  } catch {
    // preview gagal (mis. validasi) -> biarkan ongkir tampil "dihitung nanti"
    deliveryFee.value = null
    distanceKm.value = null
  }
}

watch([fulfillmentType, requestCakeDate, addressLat, addressLng], () => {
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
    const { whatsappLink } = data.data

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
        : err.response?.data?.message || 'Gagal membuat pesanan, coba lagi'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchCart)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-12">
    <h1 class="text-3xl font-extrabold mb-8">Checkout</h1>

    <div v-if="isLoading" class="text-center text-gray-500 py-24">
      Memuat checkout...
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <!-- ===== KOLOM KIRI: FORM ===== -->
      <div class="lg:col-span-2 space-y-6">
        <!-- A. Delivery Method -->
        <section class="rounded-2xl border border-gray-300 p-6">
          <div class="flex items-center gap-3 mb-5">
            <span
              class="w-7 h-7 rounded-full border border-gray-400 flex items-center justify-center text-xs font-semibold"
            >
              A
            </span>
            <h2 class="text-lg font-bold">Delivery Method</h2>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              @click="fulfillmentType = 'PICKUP'"
              class="rounded-xl border py-3.5 text-sm font-semibold transition"
              :class="
                fulfillmentType === 'PICKUP'
                  ? 'border-2 border-brand-500 bg-brand-50'
                  : 'border-gray-300 hover:border-gray-500'
              "
            >
              Pick Up
            </button>
            <button
              type="button"
              @click="fulfillmentType = 'DELIVERY'"
              class="rounded-xl border py-3.5 text-sm font-semibold transition"
              :class="
                fulfillmentType === 'DELIVERY'
                  ? 'border-2 border-brand-500 bg-brand-50'
                  : 'border-gray-300 hover:border-gray-500'
              "
            >
              Delivery
            </button>
          </div>
        </section>

        <!-- B. Receiver + C. Delivery Address (hanya untuk DELIVERY) -->
        <section v-if="isDelivery" class="rounded-2xl border border-gray-300 p-6">
          <div class="flex items-center gap-3 mb-5">
            <span
              class="w-7 h-7 rounded-full border border-gray-400 flex items-center justify-center text-xs font-semibold"
            >
              B
            </span>
            <h2 class="text-lg font-bold">Receiver</h2>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              @click="recipientType = 'FOR_MYSELF'"
              class="rounded-xl border py-3 text-sm font-semibold transition"
              :class="
                recipientType === 'FOR_MYSELF'
                  ? 'border-2 border-brand-500 bg-brand-50'
                  : 'border-gray-300 hover:border-gray-500'
              "
            >
              For Myself
            </button>
            <button
              type="button"
              @click="recipientType = 'FOR_SOMEONE_ELSE'"
              class="rounded-xl border py-3 text-sm font-semibold transition"
              :class="
                recipientType === 'FOR_SOMEONE_ELSE'
                  ? 'border-2 border-brand-500 bg-brand-50'
                  : 'border-gray-300 hover:border-gray-500'
              "
            >
              For Someone Else
            </button>
          </div>

          <!-- Data penerima (khusus For Someone Else) -->
          <div v-if="isForSomeoneElse" class="space-y-4 mt-4">
            <input
              v-model="recipientName"
              type="text"
              placeholder="Receiver's Name"
              class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
            <div class="relative">
              <Phone
                class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                v-model="recipientPhone"
                type="tel"
                placeholder="Receiver's Phone Number"
                class="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <label class="flex items-start gap-2 text-xs text-gray-600">
              <input
                v-model="recipientDataConsent"
                type="checkbox"
                class="mt-0.5 accent-brand-600"
              />
              Saya sudah mendapat izin dari penerima untuk membagikan nama dan
              nomor teleponnya.
            </label>
          </div>

          <!-- C. Delivery Address -->
          <div class="flex items-center gap-3 mt-8 mb-5">
            <span
              class="w-7 h-7 rounded-full border border-gray-400 flex items-center justify-center text-xs font-semibold"
            >
              C
            </span>
            <h2 class="text-lg font-bold">Delivery Address</h2>
          </div>

          <div class="flex gap-3">
            <div class="relative flex-1">
              <MapPin
                class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                v-model="address"
                type="text"
                placeholder="Enter your full delivery address..."
                class="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-brand-500"
                @keydown.enter.prevent="pinAddress"
              />
            </div>
            <button
              type="button"
              :disabled="isPinning"
              @click="pinAddress"
              class="shrink-0 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold flex items-center gap-2 hover:border-brand-400 transition disabled:opacity-50"
            >
              <MapPin class="w-4 h-4" />
              {{ isPinning ? '...' : 'Pin' }}
            </button>
          </div>

          <p v-if="pinError" class="text-xs text-red-600 mt-2">{{ pinError }}</p>

          <!-- Peta interaktif (Leaflet + OpenStreetMap) -->
          <div
            class="mt-4 rounded-2xl border border-gray-300 overflow-hidden h-64 relative z-0"
          >
            <div ref="mapEl" class="w-full h-full"></div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            <template v-if="addressLat === null">
              Ketik alamat lalu tekan Pin, atau klik langsung titik lokasi di peta.
            </template>
            <template v-else>
              Geser marker atau klik peta untuk koreksi titik lokasi.
              <span v-if="distanceKm !== null">
                Jarak dari toko: ± {{ distanceKm.toFixed(1) }} km
              </span>
            </template>
          </p>
        </section>

        <!-- Request Cake Date -->
        <section class="rounded-2xl border border-gray-300 p-6">
          <div class="flex items-center gap-3 mb-5">
            <span
              class="w-7 h-7 rounded-full border border-gray-400 flex items-center justify-center text-xs font-semibold"
            >
              {{ isDelivery ? 'D' : 'B' }}
            </span>
            <h2 class="text-lg font-bold">Request Cake Date</h2>
          </div>

          <input
            v-model="requestCakeDate"
            type="date"
            :min="minDate"
            class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
          />
          <p class="text-xs text-gray-500 mt-2">
            Minimum 7 days in advance. Orders within 7 days require full payment
            upfront.
          </p>
        </section>
      </div>

      <!-- ===== KOLOM KANAN: ORDER SUMMARY ===== -->
      <div class="rounded-2xl border border-gray-300 p-6 lg:sticky lg:top-24">
        <h2 class="text-xl font-bold mb-5">Order Summary</h2>

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

        <div class="border-t border-gray-300 mt-5 pt-4 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-700">Subtotal</span>
            <span class="font-medium">{{ formatRupiah(cart.subtotal) }}</span>
          </div>
          <div v-if="isDelivery" class="flex items-center justify-between">
            <span class="text-gray-700">Delivery</span>
            <span class="font-medium">
              {{ deliveryFee !== null ? formatRupiah(deliveryFee) : 'Pin lokasi dulu' }}
            </span>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-gray-300 mt-4 pt-4"
        >
          <span class="text-lg font-bold">Total</span>
          <span class="text-lg font-bold">{{ formatRupiah(total) }}</span>
        </div>

        <!-- Important -->
        <div class="rounded-xl border border-gray-300 p-4 mt-5">
          <h3 class="text-sm font-bold mb-2">Important</h3>
          <ul class="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>DP min. 50% before production</li>
            <li>Full payment by H-7</li>
            <li>No cancellation after DP</li>
            <li>DP non-refundable</li>
          </ul>
        </div>

        <p v-if="errorMessage" class="text-xs text-red-600 mt-4">
          {{ errorMessage }}
        </p>

        <button
          type="button"
          :disabled="!canSubmit || isSubmitting"
          @click="submitOrder"
          class="w-full mt-5 rounded-full border-2 border-brand-600 text-brand-600 py-3.5 text-sm font-bold hover:bg-brand-600 hover:text-white transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit"
        >
          {{ isSubmitting ? 'Memproses...' : 'Order via WhatsApp' }}
        </button>
      </div>
    </div>
  </div>
</template>
