<script setup>
// Grid pilihan flavor (TYPE2 & TYPE4) — gaya tombol radio dari desain
defineProps({
  modelValue: { type: String, default: '' },
  flavors: { type: Array, required: true },
  stepLabel: { type: String, default: 'Choose flavor' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="mb-6">
    <p class="text-[15px] font-extrabold mb-2.5">
      {{ stepLabel }} <span class="text-brand-500">*</span>
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button
        v-for="f in flavors"
        :key="f"
        type="button"
        @click="$emit('update:modelValue', f)"
        class="rounded-[10px] border-2 px-3.5 py-3 text-left font-bold text-sm text-cocoa-900 flex items-center gap-2 transition-colors"
        :class="modelValue === f
          ? 'border-brand-500 bg-[#F4D6D1]'
          : 'border-[#EBDCCC] bg-white hover:border-brand-500 hover:bg-[#F4D6D1]'"
      >
        <span
          class="w-4 h-4 rounded-full border-2 shrink-0"
          :class="modelValue === f
            ? 'border-brand-500 bg-brand-500'
            : 'border-[#D9C4AE] bg-white'"
        />
        {{ f }}
      </button>
    </div>
  </div>
</template>
