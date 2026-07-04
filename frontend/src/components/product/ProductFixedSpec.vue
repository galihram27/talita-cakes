<script setup>
import { computed } from 'vue'
import { Ruler } from 'lucide-vue-next'

// kartu info shape & size untuk produk dengan variant fixed (TYPE1 & TYPE2)
const props = defineProps({
  shape: { type: String, default: 'ROUND' },
  size: { type: [Number, String], default: null },
})

const isRound = computed(() => props.shape === 'ROUND')

const sizeText = computed(() => {
  if (props.size == null) return '-'
  return isRound.value ? `${props.size} cm` : `${props.size}×${props.size} cm`
})
</script>

<template>
  <div class="grid grid-cols-2 gap-4 mb-6">
    <!-- SHAPE -->
    <div
      class="flex items-center gap-3.5 rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4"
    >
      <div
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white border border-brand-200"
      >
        <span
          class="block w-[18px] h-[18px] border-2 border-brand-500"
          :class="isRound ? 'rounded-full' : 'rounded-[3px]'"
        />
      </div>
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Shape</p>
        <p class="text-sm font-bold text-gray-900 truncate">
          {{ isRound ? 'Round' : 'Square' }}
        </p>
      </div>
    </div>

    <!-- SIZE -->
    <div
      class="flex items-center gap-3.5 rounded-2xl border border-brand-100 bg-brand-50/60 px-5 py-4"
    >
      <div
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white border border-brand-200"
      >
        <Ruler class="w-[18px] h-[18px] text-brand-500" />
      </div>
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Size</p>
        <p class="text-sm font-bold text-gray-900 truncate">{{ sizeText }}</p>
      </div>
    </div>
  </div>
</template>
