<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// input harga dengan pemisah ribuan (150000 -> "150.000"), value tetap Number
const props = defineProps({
  modelValue: { type: Number, default: null },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const format = (value) =>
  value == null || value === '' ? '' : Number(value).toLocaleString('id-ID')

const display = computed(() => format(props.modelValue))

const onInput = (e) => {
  const digits = e.target.value.replace(/\D/g, '')
  const value = digits ? Number(digits) : null
  emit('update:modelValue', value)
  // paksa tampilan tetap terformat walau value tidak berubah (mis. user ketik huruf)
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
