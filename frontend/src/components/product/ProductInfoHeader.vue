<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, ChevronDown } from 'lucide-vue-next'

const { t, locale } = useI18n()

/**
 * Bagian kepala halaman produk: label kategori, nama, dan deskripsi.
 */

// Deskripsi mulai dalam keadaan tertutup supaya pilihan ukuran & rasa di
// bawahnya langsung terlihat tanpa harus menggulir
const showDescription = ref(false)
const toggleDescription = () => (showDescription.value = !showDescription.value)

// Label tipe memakai kamus yang sama dengan kartu tipe di halaman Home,
// jadi penyebutannya konsisten di seluruh situs
const typeLabel = (type) => {
  const num = { TYPE1: 1, TYPE2: 2, TYPE3: 3, TYPE4: 4, TYPE5: 5, TYPE6: 6 }[type]
  return num ? t(`home.types.t${num}.tag`) : type
}

const props = defineProps({
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  descriptionEn: { type: String, default: '' },
  category: { type: String, default: '' },
  subcategory: { type: String, default: '' },
})

/**
 * Label yang tampil di atas nama produk, dipilih berjenjang:
 * sub-kategori kalau ada, kalau tidak kategori, dan nama tipe sebagai
 * jalan terakhir untuk produk lama yang kategorinya belum terisi.
 */
const badgeLabel = computed(
  () => props.subcategory || props.category || typeLabel(props.type)
)

// Ikut bahasa yang aktif. Produk lama belum punya versi Inggris, jadi
// kalau kosong tetap pakai versi Indonesia daripada tidak tampil apa-apa.
const shownDescription = computed(() =>
  locale.value === 'en' && props.descriptionEn ? props.descriptionEn : props.description
)
</script>

<template>
  <div>
    <span
      class="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-500 px-3 py-1.5 text-xs font-extrabold tracking-[0.1em] uppercase"
    >
      {{ badgeLabel }}
    </span>
    <h1 class="font-display text-[38px] leading-tight mt-3.5 mb-4">{{ name }}</h1>

    <!-- Deskripsi dalam panel yang bisa dibuka-tutup. v-show dipakai (bukan
         v-if) supaya teksnya tetap ada di halaman dan terbaca mesin pencari
         walau sedang tertutup. -->
    <div
      v-if="shownDescription"
      class="mb-7 rounded-2xl border bg-white overflow-hidden transition-colors"
      :class="showDescription ? 'border-brand-500' : 'border-cream-300'"
    >
      <button
        type="button"
        @click="toggleDescription"
        class="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        :aria-expanded="showDescription"
      >
        <span
          class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-100 text-brand-500 shrink-0"
        >
          <FileText class="w-[18px] h-[18px]" stroke-width="1.9" />
        </span>
        <span class="font-extrabold text-[15px] text-cocoa-900 flex-1">
          {{ t('product.descriptionTitle') }}
        </span>
        <span
          class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F7EEE6] text-brand-500 shrink-0"
        >
          <ChevronDown
            class="w-4 h-4 transition-transform"
            :class="showDescription ? 'rotate-180' : ''"
            stroke-width="2.4"
          />
        </span>
      </button>
      <p
        v-show="showDescription"
        class="text-[15.5px] text-[#6E5A4D] leading-relaxed px-4 pb-4 -mt-0.5 whitespace-pre-line"
      >
        {{ shownDescription }}
      </p>
    </div>
  </div>
</template>
