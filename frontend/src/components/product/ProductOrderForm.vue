<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  textOnCake: { type: String, default: '' },
  notes: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  useStepper: { type: Boolean, default: false }, // TYPE3 pakai stepper "Amount", TYPE1/2 pakai input angka
  isSubmitting: { type: Boolean, default: false },
  submitError: { type: String, default: '' },
  submitSuccess: { type: Boolean, default: false },
})

const emit = defineEmits(['update:textOnCake', 'update:notes', 'update:quantity', 'submit'])

const increaseQuantity = (current) => emit('update:quantity', current + 1)
const decreaseQuantity = (current) => {
  if (current > 1) emit('update:quantity', current - 1)
}
</script>

<template>
  <div class="max-w-md">
    <div class="mb-4">
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

    <!-- qty + add to cart -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3.5 border-t border-cream-300 pt-5">
      <div
        v-if="useStepper"
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
      <div v-else class="flex items-center gap-3">
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
        {{ isSubmitting ? t('product.orderForm.adding') : t('product.orderForm.addToCart') }}
      </button>
    </div>
  </div>
</template>
