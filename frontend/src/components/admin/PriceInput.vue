<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Input harga: yang dilihat admin berpemisah ribuan ("150.000"),
// tapi nilai yang dikirim keluar tetap angka biasa (150000).
const props = defineProps({
  modelValue: { type: Number, default: null },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const format = (value) =>
  value == null || value === '' ? '' : Number(value).toLocaleString('id-ID')

const display = computed(() => format(props.modelValue))

const onInput = (e) => {
  // Buang semua selain angka, jadi huruf & tanda baca otomatis terabaikan
  const digits = e.target.value.replace(/\D/g, '')
  const value = digits ? Number(digits) : null
  emit('update:modelValue', value)
  // Tulis ulang isi input secara manual. Kalau tidak, saat admin mengetik
  // huruf nilainya tidak berubah sehingga Vue tidak me-render ulang, dan
  // huruf itu tertinggal di layar.
  e.target.value = format(value)
}
</script>

<template>
  <input
    type="text"
    inputmode="numeric"
    :value="display"
    :placeholder="placeholder || t('admin.priceInput.placeholder')"
    @input="onInput"
  />
</template>
