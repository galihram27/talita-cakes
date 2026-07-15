<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import { formatRupiah } from '@/utils/formatCurrency'

// Checkpoint terakhir sebelum order benar-benar dibuat & user dilempar ke
// WhatsApp. Sengaja menampilkan rekap lengkap, bukan sekadar "Anda yakin?":
// setelah ini order tercatat dan (sesuai kebijakan) tidak bisa dibatalkan,
// jadi user harus bisa mengecek tanggal/alamat/total sekali lagi di sini.
const props = defineProps({
  open: { type: Boolean, default: false },
  isSubmitting: { type: Boolean, default: false },
  // { requestCakeDate, fulfillmentType, recipientType, recipientName,
  //   recipientPhone, address, distanceKm, items, subtotal, deliveryFee,
  //   total, includeEmail, email }
  details: { type: Object, required: true },
})

const emit = defineEmits(['confirm', 'cancel'])
const { t, locale } = useI18n()

// Kunci scroll halaman selama modal terbuka supaya halaman checkout di
// belakangnya tidak ikut bergeser. Nilai overflow asal disimpan lalu
// dikembalikan (bukan di-reset ke ''), supaya style body dari tempat lain
// tidak ikut terhapus.
let previousBodyOverflow = null

const lockBodyScroll = () => {
  if (previousBodyOverflow !== null) return // sudah terkunci
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

// Modal bisa ikut hilang bersama halaman (mis. setelah order sukses & pindah
// route) tanpa `open` sempat kembali false — buka kuncinya di sini juga.
onBeforeUnmount(unlockBodyScroll)

const formatDate = (dateString) =>
  dateString
    ? new Date(dateString).toLocaleDateString(
        locale.value === 'en' ? 'en-US' : 'id-ID',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      )
    : ''
</script>

<template>
  <!-- Teleport ke body: root CheckoutView (.tc-page) menganimasikan transform,
       dan elemen ber-transform jadi containing block untuk anaknya yang
       position:fixed — tanpa ini `inset-0` mengacu ke kotak .tc-page (setinggi
       halaman) sehingga modal ter-center terhadap halaman, bukan layar.
       Pola yang sama dipakai modal detail di GalleryView. -->
  <Teleport to="body">
    <!-- Overlay fixed & tidak bisa di-scroll: modal diam di tengah layar,
         halaman di belakangnya dikunci lewat lockBodyScroll(). -->
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8 overflow-hidden overscroll-contain"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md shadow-[0_10px_40px_-12px_rgba(51,38,31,0.35)] flex flex-col max-h-full"
        role="dialog"
        aria-modal="true"
      >
        <!-- HEADER -->
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

        <!-- BODY. Katup pengaman: kalau isinya lebih tinggi dari layar (mis. cart
             dengan banyak item di layar pendek), yang scroll cukup bagian ini —
             header & tombol konfirmasi tetap terlihat. Untuk pesanan normal
             konten muat penuh sehingga tidak ada scroll sama sekali. -->
        <div class="px-6 py-5 overflow-y-auto overscroll-contain">
          <p class="text-[13.5px] text-[#6E5A4D] mb-4">
            {{ t('checkout.confirm.intro') }}
          </p>

          <!-- Rekap -->
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

          <!-- Item + total -->
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

        <!-- FOOTER -->
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
