<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ruler } from 'lucide-vue-next'

const { t } = useI18n()

// kartu info shape & size untuk produk dengan variant fixed (TYPE1 & TYPE2)
const props = defineProps({
  shape: { type: String, default: 'ROUND' },
  size: { type: [Number, String], default: null },
})

const isRound = computed(() => props.shape === 'ROUND')

const isSquareSize = computed(() => props.size != null && !isRound.value)

const sizeText = computed(() => {
  if (props.size == null) return '-'
  return `${props.size} cm`
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 mb-6 max-w-md">
    <!-- SHAPE -->
    <div
      class="flex items-center gap-3.5 rounded-2xl border border-cream-300 bg-gradient-to-br from-white to-[#FDF7F1] px-4 py-3.5"
    >
      <div
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[#F4E7D8] text-[#6B4423]"
      >
        <span
          class="block w-[18px] h-[18px] border-2 border-[#6B4423]"
          :class="isRound ? 'rounded-full' : 'rounded-[3px]'"
        />
      </div>
      <div class="min-w-0">
        <p class="text-[11px] font-extrabold uppercase tracking-widest text-cocoa-400">{{ t('product.shape') }}</p>
        <p class="font-display text-[16.5px] text-cocoa-900 leading-tight truncate">
          {{ isRound ? t('product.round') : t('product.square') }}
        </p>
      </div>
    </div>

    <!-- SIZE -->
    <div
      class="flex items-center gap-3.5 rounded-2xl border border-cream-300 bg-gradient-to-br from-white to-[#FDF7F1] px-4 py-3.5"
    >
      <div
        class="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[#F4E7D8] text-[#6B4423]"
      >
        <Ruler class="w-[18px] h-[18px]" />
      </div>
      <div class="min-w-0">
        <p class="text-[11px] font-extrabold uppercase tracking-widest text-cocoa-400">{{ t('product.size') }}</p>
        <p class="font-display text-[16.5px] text-cocoa-900 leading-tight truncate">
          <template v-if="isSquareSize"
            >{{ size }}<span class="font-sans font-bold text-[#6B4423] mx-0.5">×</span
            >{{ size }} cm</template
          >
          <template v-else>{{ sizeText }}</template>
        </p>
      </div>
    </div>
  </div>
</template>
