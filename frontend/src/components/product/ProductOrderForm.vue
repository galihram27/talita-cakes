<script setup>
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
  <div>
    <div class="mb-6">
      <label class="block text-sm font-semibold mb-2">Text on Cake (Optional)</label>
      <input
        :value="textOnCake"
        @input="$emit('update:textOnCake', $event.target.value)"
        type="text"
        placeholder="Contoh: Happy Birthday Nadia"
        class="w-full rounded-xl border border-gray-300 px-5 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
    </div>

    <div class="mb-8">
      <label class="block text-sm font-semibold mb-2">Additional Notes</label>
      <textarea
        :value="notes"
        @input="$emit('update:notes', $event.target.value)"
        rows="4"
        placeholder="Catatan tambahan untuk pesanan kamu..."
        class="w-full rounded-xl border border-gray-300 px-5 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
      ></textarea>
    </div>

    <div class="mb-8">
      <label class="block text-sm font-semibold mb-2">{{ useStepper ? 'Amount' : 'Quantity' }}</label>

      <input
        v-if="!useStepper"
        :value="quantity"
        @input="$emit('update:quantity', Number($event.target.value))"
        type="number"
        min="1"
        class="w-28 rounded-xl border border-gray-300 px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />

      <div v-else class="flex items-center gap-4">
        <button
          type="button"
          @click="decreaseQuantity(quantity)"
          class="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:border-gray-500 transition"
          aria-label="Kurangi jumlah"
        >
          −
        </button>
        <span class="text-lg font-medium w-6 text-center">{{ quantity }}</span>
        <button
          type="button"
          @click="increaseQuantity(quantity)"
          class="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:border-gray-500 transition"
          aria-label="Tambah jumlah"
        >
          +
        </button>
      </div>
    </div>

    <p v-if="submitError" class="text-sm text-red-600 mb-4">{{ submitError }}</p>
    <p v-if="submitSuccess" class="text-sm text-green-600 mb-4">Berhasil ditambahkan ke keranjang!</p>

    <button
      type="button"
      :disabled="isSubmitting"
      @click="$emit('submit')"
      class="w-full rounded-full border border-brand-600 bg-brand-600 text-white py-4 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ isSubmitting ? 'Menambahkan...' : '🛒 Add to Cart' }}
    </button>
  </div>
</template>