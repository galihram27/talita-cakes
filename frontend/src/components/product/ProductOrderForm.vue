<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatRupiah } from '@/utils/formatCurrency'

const { t } = useI18n()

/**
 * Bagian penutup halaman produk: tulisan di atas kue, catatan, jumlah,
 * dan tombol masukkan ke keranjang.
 *
 * Dipakai bersama seluruh tipe produk, karena itu banyak prop yang isinya
 * "sembunyikan bagian ini" — tiap tipe punya kebutuhan berbeda, misalnya
 * roti tidak butuh kolom tulisan di atas kue.
 */
const props = defineProps({
  textOnCake: { type: String, default: '' },
  notes: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  minQuantity: { type: Number, default: 1 }, // goodiebag punya pembelian minimal
  quantitySuffix: { type: String, default: '' }, // satuan di sebelah angka, mis. "box"
  useStepper: { type: Boolean, default: false }, // tombol +/- atau kolom ketik biasa
  hideQuantity: { type: Boolean, default: false }, // untuk tipe yang jumlahnya diisi di tempat lain
  showTextOnCake: { type: Boolean, default: true },
  isSubmitting: { type: Boolean, default: false },
  submitError: { type: String, default: '' },
  submitSuccess: { type: Boolean, default: false },
  // Harga satuan setelah diskon, dipakai menghitung total di tombol.
  // null berarti belum bisa dihitung — biasanya ukurannya belum dipilih.
  unitPrice: { type: Number, default: null },
})

const emit = defineEmits(['update:textOnCake', 'update:notes', 'update:quantity', 'submit'])

// Total di label tombol. Dikosongkan kalau harganya belum bisa dipastikan.
const totalLabel = computed(() =>
  props.unitPrice != null && props.unitPrice > 0
    ? formatRupiah(props.unitPrice * (props.quantity || 1))
    : ''
)

const increaseQuantity = (current) => emit('update:quantity', current + 1)
// Tidak boleh turun di bawah pembelian minimal produk
const decreaseQuantity = (current) => {
  if (current > props.minQuantity) emit('update:quantity', current - 1)
}
</script>

<template>
  <div class="max-w-md">
    <div v-if="showTextOnCake" class="mb-4">
      <label class="block text-[15px] font-extrabold mb-2">
        {{ t('product.orderForm.writingLabel') }}
        <span class="text-[#B7A18E] font-semibold text-[13px]">{{ t('product.orderForm.optional') }}</span>
      </label>
      <input
        :value="textOnCake"
        @input="$emit('update:textOnCake', $event.target.value)"
        type="text"
        maxlength="60"
        :placeholder="t('product.orderForm.writingPlaceholder')"
        class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E]"
      />
    </div>

    <div class="mb-6">
      <label class="block text-[15px] font-extrabold mb-2">
        {{ t('product.orderForm.noteLabel') }}
        <span class="text-[#B7A18E] font-semibold text-[13px]">{{ t('product.orderForm.optional') }}</span>
      </label>
      <textarea
        :value="notes"
        @input="$emit('update:notes', $event.target.value)"
        rows="3"
        :placeholder="t('product.orderForm.notePlaceholder')"
        class="w-full rounded-xl border-[1.5px] border-[#E4D3C1] bg-white px-4 py-3 text-[14.5px] text-cocoa-900 placeholder-[#B7A18E] resize-y"
      ></textarea>
    </div>

    <div
      v-if="submitError"
      class="bg-[#FBE9E7] border border-[#F0C9C4] text-brand-500 rounded-[10px] px-4 py-2.5 text-[13.5px] font-bold mb-3.5"
    >
      {{ submitError }}
    </div>
    <div
      v-if="submitSuccess"
      class="tc-fade bg-[#E9F6EE] border border-[#C9E7D6] text-[#2E9E6B] rounded-[10px] px-4 py-2.5 text-[13.5px] font-bold mb-3.5"
    >
      {{ t('product.orderForm.addedToCart') }}
    </div>

    <!-- Baris jumlah + tombol masukkan keranjang. Bentuk pengatur jumlahnya
         berbeda per tipe produk: tombol +/-, kolom ketik, atau disembunyikan
         sama sekali kalau jumlahnya sudah diisi di bagian lain. -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3.5 border-t border-cream-300 pt-5">
      <div
        v-if="!hideQuantity && useStepper"
        class="flex items-center self-start border-[1.5px] border-[#E4D3C1] rounded-full bg-white"
      >
        <button
          type="button"
          @click="decreaseQuantity(quantity)"
          class="w-[42px] h-[46px] text-lg text-brand-500 font-extrabold rounded-full hover:bg-brand-100 transition-colors"
          :aria-label="t('product.orderForm.decreaseQty')"
        >
          −
        </button>
        <span class="min-w-[34px] text-center font-extrabold text-base">
          {{ quantity }}<span v-if="quantitySuffix" class="ml-0.5 text-xs font-semibold text-[#B7A18E]">{{ quantitySuffix }}</span>
        </span>
        <button
          type="button"
          @click="increaseQuantity(quantity)"
          class="w-[42px] h-[46px] text-lg text-brand-500 font-extrabold rounded-full hover:bg-brand-100 transition-colors"
          :aria-label="t('product.orderForm.increaseQty')"
        >
          +
        </button>
      </div>
      <div v-else-if="!hideQuantity" class="flex items-center gap-3">
        <div class="flex items-center self-start border-[1.5px] border-[#E4D3C1] rounded-full bg-white">
          <button
            type="button"
            @click="decreaseQuantity(quantity)"
            class="w-[42px] h-[46px] text-lg text-brand-500 font-extrabold rounded-full hover:bg-brand-100 transition-colors"
            :aria-label="t('product.orderForm.decreaseQty')"
          >
            −
          </button>
          <span class="min-w-[34px] text-center font-extrabold text-base">{{ quantity }}</span>
          <button
            type="button"
            @click="increaseQuantity(quantity)"
            class="w-[42px] h-[46px] text-lg text-brand-500 font-extrabold rounded-full hover:bg-brand-100 transition-colors"
            :aria-label="t('product.orderForm.increaseQty')"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        :disabled="isSubmitting"
        @click="$emit('submit')"
        class="flex-1 inline-flex items-center justify-center gap-3 bg-gradient-to-br from-[#C6423F] to-[#A82E30] text-white rounded-full px-5 py-[15px] font-extrabold text-[15.5px] shadow-[0_12px_26px_-12px_rgba(169,46,48,0.65)] hover:-translate-y-px hover:shadow-[0_16px_32px_-12px_rgba(169,46,48,0.78)] active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <template v-if="isSubmitting">{{ t('product.orderForm.adding') }}</template>
        <template v-else>
          <span>{{ t('product.orderForm.addToCart') }}</span>
          <span
            v-if="totalLabel"
            class="pl-3 ml-1 border-l border-white/35 font-extrabold"
          >
            {{ totalLabel }}
          </span>
        </template>
      </button>
    </div>
  </div>
</template>
