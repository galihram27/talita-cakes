<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import { formatRupiah } from '@/utils/formatCurrency'

/**
 * Layar konfirmasi terakhir sebelum pesanan dibuat.
 *
 * Isinya sengaja rekap lengkap, bukan sekadar "Anda yakin?". Begitu tombol
 * konfirmasi ditekan, pesanan tercatat dan pembeli langsung dilempar ke
 * WhatsApp — jadi ini kesempatan terakhir mengecek tanggal, alamat, dan total.
 *
 * Komponen ini hanya menampilkan. Yang benar-benar menyimpan pesanan adalah
 * halaman checkout, lewat event `confirm`.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  isSubmitting: { type: Boolean, default: false },
  // Ringkasan pesanan yang sudah dihitung halaman checkout: tanggal, cara
  // ambil/kirim, alamat, penerima, daftar item, dan rincian biayanya
  details: { type: Object, required: true },
})

const emit = defineEmits(['confirm', 'cancel'])
const { t, locale } = useI18n()

// ===== KUNCI GULIRAN HALAMAN =====
// Selama modal terbuka, halaman checkout di belakangnya dibuat tidak bisa
// digulir — kalau tidak, menggulir di dalam modal ikut menggeser halaman.
//
// Nilai `overflow` yang lama disimpan dulu lalu dikembalikan seperti semula,
// bukan sekadar dikosongkan, supaya pengaturan dari bagian lain aplikasi
// tidak ikut terhapus.
let previousBodyOverflow = null

const lockBodyScroll = () => {
  if (previousBodyOverflow !== null) return // sudah terkunci, jangan timpa
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

const unlockBodyScroll = () => {
  if (previousBodyOverflow === null) return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = null
}

watch(
  () => props.open,
  (open) => (open ? lockBodyScroll() : unlockBodyScroll()),
  { immediate: true }
)

// Setelah pesanan berhasil, halaman langsung berpindah dan komponen ini hilang
// tanpa `open` sempat kembali false. Tanpa baris ini, halaman berikutnya
// mewarisi keadaan terkunci dan tidak bisa digulir sama sekali.
onBeforeUnmount(unlockBodyScroll)

// Tanggal ditampilkan lengkap dengan nama hari, mengikuti bahasa yang aktif
const formatDate = (dateString) =>
  dateString
    ? new Date(dateString).toLocaleDateString(
        locale.value === 'en' ? 'en-US' : 'id-ID',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      )
    : ''
</script>

<template>
  <!-- Modal dipindahkan ke <body>. Kalau dibiarkan di tempat asalnya, ia
       berada di dalam pembungkus halaman checkout yang beranimasi, dan itu
       membuat modal ter-tengah terhadap TINGGI HALAMAN, bukan terhadap layar —
       jadi bisa muncul jauh di bawah. Pola yang sama dipakai modal galeri. -->
  <Teleport to="body">
    <!-- Latar gelap menutupi seluruh layar dan tidak ikut bergulir -->
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8 overflow-hidden overscroll-contain"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md shadow-[0_10px_40px_-12px_rgba(51,38,31,0.35)] flex flex-col max-h-full"
        role="dialog"
        aria-modal="true"
      >
        <!-- Judul + tombol tutup. shrink-0 menahannya tetap terlihat
             saat bagian tengah bergulir. -->
        <div class="shrink-0 flex items-center justify-between px-6 py-5 border-b border-cream-200">
          <h2 class="font-display text-xl text-cocoa-900">
            {{ t('checkout.confirm.title') }}
          </h2>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="emit('cancel')"
            class="p-1 text-cocoa-400 hover:text-cocoa-900 transition disabled:opacity-40"
            :aria-label="t('common.close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Hanya bagian tengah ini yang bisa digulir, dan hanya kalau isinya
             memang tidak muat (mis. keranjang panjang di layar pendek). Dengan
             begitu tombol konfirmasi di bawah selalu terjangkau. -->
        <div class="px-6 py-5 overflow-y-auto overscroll-contain">
          <p class="text-[13.5px] text-[#6E5A4D] mb-4">
            {{ t('checkout.confirm.intro') }}
          </p>

          <!-- Rekap pesanan. Baris alamat, penerima, dan email hanya muncul
               kalau memang relevan — pesanan ambil sendiri tidak butuh alamat. -->
          <dl class="rounded-xl border border-cream-300 bg-cream-50 divide-y divide-[#F0E3D6]">
            <div class="flex gap-3 px-4 py-2.5">
              <dt class="w-28 shrink-0 text-[12.5px] font-bold text-cocoa-400">
                {{ t('checkout.confirm.date') }}
              </dt>
              <dd class="text-[13.5px] text-cocoa-900 font-bold">
                {{ formatDate(details.requestCakeDate) }}
              </dd>
            </div>

            <div class="flex gap-3 px-4 py-2.5">
              <dt class="w-28 shrink-0 text-[12.5px] font-bold text-cocoa-400">
                {{ t('checkout.confirm.method') }}
              </dt>
              <dd class="text-[13.5px] text-cocoa-900">
                {{ details.fulfillmentType === 'DELIVERY'
                  ? t('checkout.delivery')
                  : t('checkout.pickup') }}
                <span v-if="details.distanceKm !== null" class="text-cocoa-400">
                  · ± {{ details.distanceKm.toFixed(1) }} km
                </span>
              </dd>
            </div>

            <div v-if="details.fulfillmentType === 'DELIVERY'" class="flex gap-3 px-4 py-2.5">
              <dt class="w-28 shrink-0 text-[12.5px] font-bold text-cocoa-400">
                {{ t('checkout.confirm.address') }}
              </dt>
              <dd class="text-[13.5px] text-cocoa-900 leading-snug break-words min-w-0">
                {{ details.address }}
              </dd>
            </div>

            <div
              v-if="details.fulfillmentType === 'DELIVERY' && details.recipientType === 'FOR_SOMEONE_ELSE'"
              class="flex gap-3 px-4 py-2.5"
            >
              <dt class="w-28 shrink-0 text-[12.5px] font-bold text-cocoa-400">
                {{ t('checkout.confirm.recipient') }}
              </dt>
              <dd class="text-[13.5px] text-cocoa-900 break-words min-w-0">
                {{ details.recipientName }}
                <span class="text-cocoa-400">· {{ details.recipientPhone }}</span>
              </dd>
            </div>

            <div v-if="details.includeEmail && details.email" class="flex gap-3 px-4 py-2.5">
              <dt class="w-28 shrink-0 text-[12.5px] font-bold text-cocoa-400">
                {{ t('checkout.confirm.email') }}
              </dt>
              <dd class="text-[13.5px] text-cocoa-900 break-all min-w-0">
                {{ details.email }}
              </dd>
            </div>
          </dl>

          <!-- Daftar barang yang dipesan -->
          <ul class="flex flex-col gap-2.5 mt-4">
            <li
              v-for="item in details.items"
              :key="item.id"
              class="flex items-start justify-between gap-3 text-[13.5px]"
            >
              <span class="text-cocoa-900 font-bold leading-snug">
                {{ item.productName }}
                <span class="text-cocoa-400 font-semibold">×{{ item.quantity }}</span>
              </span>
              <span class="shrink-0 font-bold">{{ formatRupiah(item.lineTotal) }}</span>
            </li>
          </ul>

          <!-- Rincian biaya. Ongkir hanya ditampilkan untuk pesanan antar. -->
          <div class="border-t border-cream-200 mt-3.5 pt-3">
            <div class="flex justify-between text-[13.5px] text-[#6E5A4D] py-0.5">
              <span>{{ t('checkout.subtotal') }}</span>
              <strong class="text-cocoa-900">{{ formatRupiah(details.subtotal) }}</strong>
            </div>
            <div
              v-if="details.fulfillmentType === 'DELIVERY'"
              class="flex justify-between text-[13.5px] text-[#6E5A4D] py-0.5"
            >
              <span>{{ t('checkout.shipping') }}</span>
              <strong class="text-cocoa-900">{{ formatRupiah(details.deliveryFee ?? 0) }}</strong>
            </div>
            <div class="flex justify-between text-[16px] font-extrabold pt-2">
              <span>{{ t('checkout.total') }}</span>
              <span class="text-brand-500">{{ formatRupiah(details.total) }}</span>
            </div>
          </div>
        </div>

        <!-- Kedua tombol dimatikan selagi pesanan sedang dikirim, supaya tidak
             terkirim dua kali kalau diklik berulang -->
        <div
          class="shrink-0 flex items-center justify-end gap-3 px-6 py-5 border-t border-cream-200"
        >
          <button
            type="button"
            :disabled="isSubmitting"
            @click="emit('cancel')"
            class="rounded-full border border-cream-300 px-5 py-2.5 text-sm font-extrabold text-cocoa-500 hover:bg-cream-50 transition disabled:opacity-50"
          >
            {{ t('checkout.confirm.back') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="emit('confirm')"
            class="rounded-full bg-brand-500 text-white px-6 py-2.5 text-sm font-extrabold hover:bg-brand-600 transition disabled:opacity-50"
          >
            {{ isSubmitting ? t('checkout.submitting') : t('checkout.confirm.submit') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
