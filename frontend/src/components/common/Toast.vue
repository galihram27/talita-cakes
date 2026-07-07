<script setup>
import { watch, onBeforeUnmount, ref } from 'vue'
import { CheckCircle2 } from 'lucide-vue-next'

// Toast sukses ringan: muncul di kanan-bawah lalu hilang otomatis.
// Dikontrol lewat v-model:message — set string untuk menampilkan, '' untuk sembunyi.
const props = defineProps({
  message: { type: String, default: '' },
  duration: { type: Number, default: 2600 },
})

const emit = defineEmits(['update:message'])

const visible = ref(false)
let hideTimer = null

watch(
  () => props.message,
  (msg) => {
    clearTimeout(hideTimer)
    if (msg) {
      visible.value = true
      hideTimer = setTimeout(() => {
        visible.value = false
        emit('update:message', '')
      }, props.duration)
    } else {
      visible.value = false
    }
  }
)

onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="tc-fade fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 rounded-full bg-[#E9F6EE] border border-[#C9E7D6] text-[#2E9E6B] px-5 py-3 text-sm font-bold shadow-[0_10px_30px_-12px_rgba(46,158,107,0.5)]"
      role="status"
    >
      <CheckCircle2 class="w-5 h-5 shrink-0" />
      {{ message }}
    </div>
  </Teleport>
</template>
