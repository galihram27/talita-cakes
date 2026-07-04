<script setup>
defineProps({
  image: { type: String, default: '' },
  alt: { type: String, default: '' },
})
</script>

<template>
  <div class="w-full max-w-md mx-auto md:mx-0 aspect-[4/5] rounded-2xl border border-gray-300 bg-gray-200 overflow-hidden">
    <img v-if="image" :src="image" :alt="alt" class="w-full h-full object-cover" />
  </div>
</template>