<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FLAVOR_DESCRIPTIONS } from '@/config/constants'

// Grid pilihan flavor (TYPE2 & TYPE4) — gaya tombol radio dari desain
const props = defineProps({
  modelValue: { type: String, default: '' },
  flavors: { type: Array, required: true },
  stepLabel: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
const { t, locale } = useI18n()

// Popup penjelasan rasa
const showGuide = ref(false)

const lang = computed(() => (locale.value?.startsWith('id') ? 'id' : 'en'))

// hanya tampilkan flavor yang punya penjelasan
const guideItems = computed(() =>
  props.flavors
    .filter((f) => FLAVOR_DESCRIPTIONS[f])
    .map((f) => ({ name: f, desc: FLAVOR_DESCRIPTIONS[f][lang.value] }))
)
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <p class="text-[15px] font-extrabold">
        {{ stepLabel || t('product.chooseFlavor') }} <span class="text-brand-500">*</span>
      </p>
      <button
        v-if="guideItems.length"
        type="button"
        @click="showGuide = true"
        class="shrink-0 flex items-center gap-1 text-[13px] font-bold text-brand-500 hover:opacity-70"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        {{ t('product.flavorGuide') }}
      </button>
    </div>
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

    <!-- POPUP PENJELASAN RASA -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showGuide"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-5"
          @click.self="showGuide = false"
        >
          <div
            class="w-full sm:max-w-[520px] max-h-[85vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-cream-200">
              <h2 class="font-display text-[20px] text-cocoa-900">{{ t('product.flavorGuideTitle') }}</h2>
              <button
                type="button"
                @click="showGuide = false"
                :aria-label="t('product.close')"
                class="shrink-0 text-[#B7A18E] hover:text-cocoa-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div class="overflow-y-auto px-5 py-4 flex flex-col gap-4">
              <div v-for="item in guideItems" :key="item.name">
                <p class="font-extrabold text-[15px] text-cocoa-900 mb-1">{{ item.name }}</p>
                <p class="text-[14px] leading-[1.7] text-[#6E5A4D]">{{ item.desc }}</p>
              </div>
            </div>

            <div class="px-5 py-4 border-t border-cream-200">
              <button
                type="button"
                @click="showGuide = false"
                class="w-full rounded-full bg-brand-500 text-white py-3 text-[15px] font-extrabold hover:bg-brand-600 transition-colors"
              >
                {{ t('product.close') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
