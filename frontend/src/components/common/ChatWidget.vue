<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { MessageCircle, X, Send, Square, RotateCcw, Sparkles } from 'lucide-vue-next'
import { useChatStore, MAX_USER_LENGTH } from '@/stores/chat.store'
import { renderChatMarkdown } from '@/utils/chatMarkdown'
import { STORE_INFO } from '@/config/constants'

/**
 * Asisten belanja: tombol melayang di atas tombol WhatsApp, dan panel
 * percakapan yang terbuka saat tombol itu diklik.
 *
 * Tidak digambar sama sekali saat halaman dipra-render, karena percakapan
 * hanya ada di peramban dan status fitur harus ditanyakan ke server dulu.
 * Tombolnya baru muncul setelah server menjawab bahwa fitur menyala.
 */

const chat = useChatStore()
const route = useRoute()

const isMounted = ref(false)
const draft = ref('')
const listEl = ref(null)
const inputEl = ref(null)

// Halaman admin tidak butuh asisten belanja, dan tombolnya menutupi
// tombol aksi di tabel
const visible = computed(
  () => isMounted.value && chat.enabled && !route.path.startsWith('/admin')
)

const whatsappUrl = STORE_INFO.whatsappNumber
  ? `https://wa.me/${STORE_INFO.whatsappNumber}`
  : ''

const SUGGESTIONS = [
  'Ada kue apa saja?',
  'Berapa harga cupcake?',
  'Bagaimana cara memesan?',
]

// Kuota habis (429) atau pesan ditolak (400) tidak akan berhasil kalau
// langsung dicoba lagi, jadi tombol ulangi hanya untuk kegagalan lain
const canRetry = computed(() => chat.error && ![400, 429].includes(chat.error.status))

/**
 * Gulir ke bawah saat ada isi baru, tapi hanya kalau pembeli memang sedang
 * di bawah. Kalau ia sedang menggulir ke atas membaca jawaban lama,
 * menariknya paksa ke bawah setiap ada potongan baru itu mengganggu.
 */
let stickToBottom = true
const onScroll = () => {
  const el = listEl.value
  if (el) stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}
const scrollToBottom = async (force = false) => {
  await nextTick()
  const el = listEl.value
  if (el && (force || stickToBottom)) el.scrollTop = el.scrollHeight
}

watch(
  () => [chat.messages.length, chat.messages.at(-1)?.text, chat.status, chat.error],
  () => scrollToBottom()
)

// Kotak ketik ikut memanjang sampai sekitar lima baris, lalu menggulir
const resizeInput = () => {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

const submit = (text = draft.value) => {
  if (!text.trim() || chat.isBusy) return
  chat.send(text)
  draft.value = ''
  nextTick(resizeInput)
  scrollToBottom(true)
}

// Enter mengirim, Shift+Enter membuat baris baru. `isComposing` menjaga
// pengguna keyboard IME yang menekan Enter untuk memilih kata.
const onKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}

const openPanel = async () => {
  chat.open()
  await scrollToBottom(true)
  inputEl.value?.focus()
}

const onEscape = (e) => {
  if (e.key === 'Escape' && chat.isOpen) chat.close()
}

onMounted(() => {
  isMounted.value = true
  chat.init()
  window.addEventListener('keydown', onEscape)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onEscape))
</script>

<template>
  <template v-if="visible">
    <!-- Tombol pembuka, ditumpuk tepat di atas tombol WhatsApp (bottom-6,
         tinggi 14) supaya keduanya tidak bertumpuk -->
    <button
      v-show="!chat.isOpen"
      type="button"
      aria-label="Buka asisten belanja"
      class="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:scale-110 hover:bg-brand-600 hover:shadow-xl"
      @click="openPanel"
    >
      <MessageCircle class="h-7 w-7" />
    </button>

    <!-- Di ponsel panel memenuhi layar; mulai layar kecil ke atas ia
         melayang di pojok kanan bawah, menutupi kedua tombol. WhatsApp
         tetap terjangkau lewat tautan di kepala panel. -->
    <Transition name="chat-panel">
      <section
        v-if="chat.isOpen"
        role="dialog"
        aria-label="Asisten belanja"
        class="fixed inset-0 z-[60] flex flex-col bg-white sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(600px,calc(100dvh-3rem))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-[#EBDCCC] sm:shadow-[0_18px_44px_-14px_rgba(51,38,31,0.4)] overflow-hidden"
      >
        <!-- Kepala -->
        <header class="flex items-center gap-3 border-b border-cream-300 bg-cream-50 px-4 py-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
            <Sparkles class="h-[18px] w-[18px]" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-display text-[17px] leading-tight">Asisten Talita</h2>
            <p class="truncate text-xs text-cocoa-400">Tanya produk, harga, dan cara memesan</p>
          </div>
          <button
            v-if="chat.messages.length"
            type="button"
            title="Mulai percakapan baru"
            aria-label="Mulai percakapan baru"
            class="rounded-full p-2 text-cocoa-500 transition hover:bg-cream-200"
            @click="chat.reset()"
          >
            <RotateCcw class="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Tutup asisten"
            class="rounded-full p-2 text-cocoa-500 transition hover:bg-cream-200"
            @click="chat.close()"
          >
            <X class="h-5 w-5" />
          </button>
        </header>

        <!-- Percakapan -->
        <div
          ref="listEl"
          class="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
          aria-live="polite"
          @scroll="onScroll"
        >
          <!-- Keadaan kosong: sapaan + contoh pertanyaan -->
          <div v-if="!chat.messages.length" class="pt-2">
            <div class="chat-bubble-assistant">
              Halo! Saya asisten Talita's Cake. Saya bisa bantu cek produk,
              harga, dan cara memesan. Mau tanya apa?
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="s in SUGGESTIONS"
                :key="s"
                type="button"
                class="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-600 transition hover:bg-brand-100"
                @click="submit(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <template v-for="(m, i) in chat.messages" :key="i">
            <div v-if="m.role === 'user'" class="flex justify-end">
              <div class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2 text-sm text-white">
                {{ m.text }}
              </div>
            </div>
            <div v-else-if="m.text" class="flex flex-col items-start">
              <!-- Aman dipakai dengan v-html: renderChatMarkdown meng-escape
                   seluruh teks dulu, lihat utils/chatMarkdown.js -->
              <div class="chat-bubble-assistant chat-markdown" v-html="renderChatMarkdown(m.text)" />
              <span v-if="m.failed" class="mt-1 px-1 text-[11px] text-cocoa-400">
                Jawaban tidak lengkap
              </span>
            </div>
          </template>

          <!-- Menunggu kata pertama. Dengan tool, jeda ini bisa beberapa
               detik — tanpa tanda apa pun pembeli mengira widgetnya macet. -->
          <div v-if="chat.status === 'waiting'" class="chat-bubble-assistant inline-flex items-center gap-1" aria-label="Asisten sedang mengetik">
            <span class="chat-dot" />
            <span class="chat-dot [animation-delay:0.15s]" />
            <span class="chat-dot [animation-delay:0.3s]" />
          </div>

          <!-- Kegagalan: pesan dari server sudah ramah, cukup ditampilkan
               bersama jalan keluarnya -->
          <div
            v-if="chat.error"
            class="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-700"
            role="alert"
          >
            <p>{{ chat.error.message }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-if="canRetry"
                type="button"
                class="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-100"
                @click="chat.retry()"
              >
                Coba lagi
              </button>
              <a
                v-if="whatsappUrl"
                :href="whatsappUrl"
                target="_blank"
                rel="noopener"
                class="rounded-full bg-[#25D366] px-3 py-1 text-[13px] font-semibold text-white transition hover:brightness-95"
              >
                Chat WhatsApp
              </a>
            </div>
          </div>
        </div>

        <!-- Kotak ketik -->
        <form class="border-t border-cream-300 px-3 pb-3 pt-2.5" @submit.prevent="submit()">
          <div class="flex items-end gap-2 rounded-2xl border border-cream-500 bg-cream-50 py-1.5 pl-3.5 pr-1.5 focus-within:border-brand-300">
            <textarea
              ref="inputEl"
              v-model="draft"
              rows="1"
              :maxlength="MAX_USER_LENGTH"
              placeholder="Tulis pertanyaanmu…"
              aria-label="Pertanyaan"
              class="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-cocoa-400"
              @input="resizeInput"
              @keydown="onKeydown"
            />
            <!-- Selagi menjawab, tombol kirim berganti jadi tombol berhenti -->
            <button
              v-if="chat.isBusy"
              type="button"
              aria-label="Hentikan jawaban"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cocoa-900 text-white transition hover:bg-cocoa-500"
              @click="chat.stop()"
            >
              <Square class="h-3.5 w-3.5" fill="currentColor" />
            </button>
            <button
              v-else
              type="submit"
              aria-label="Kirim"
              :disabled="!draft.trim()"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send class="h-4 w-4" />
            </button>
          </div>
          <!-- Asisten bisa keliru, dan yang mengikat tetap hitungan server
               di keranjang. Pembeli perlu tahu itu sebelum mengandalkannya. -->
          <p class="mt-1.5 px-1 text-center text-[11px] text-cocoa-400">
            Asisten AI bisa keliru. Harga final tampil di keranjang.
          </p>
        </form>
      </section>
    </Transition>
  </template>
</template>

<style scoped>
/* Dipakai di tiga tempat (sapaan, jawaban, tanda mengetik), jadi ditulis
   sekali di sini daripada mengulang deretan kelas yang sama */
.chat-bubble-assistant {
  max-width: 85%;
  overflow-wrap: anywhere;
  border: 1px solid var(--color-cream-300);
  border-radius: 1rem 1rem 1rem 0.375rem;
  background: var(--color-cream-50);
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--color-cocoa-900);
}

/* Isi dari renderChatMarkdown dibuat lewat v-html, jadi tidak ikut kena
   gaya scoped kecuali lewat :deep */
.chat-markdown :deep(p + p),
.chat-markdown :deep(p + ul),
.chat-markdown :deep(p + ol),
.chat-markdown :deep(ul + p),
.chat-markdown :deep(ol + p) {
  margin-top: 0.5rem;
}
.chat-markdown :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.chat-markdown :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.chat-markdown :deep(li + li) {
  margin-top: 0.125rem;
}
.chat-markdown :deep(strong) {
  font-weight: 700;
}
.chat-markdown :deep(a) {
  color: var(--color-brand-600);
  text-decoration: underline;
  word-break: break-all;
}

.chat-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--color-cocoa-400);
  animation: chatDot 1s infinite ease-in-out;
}
@keyframes chatDot {
  0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}

/* Panel seolah muncul dari arah tombol di pojok kanan bawah */
.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: transform 0.22s ease, opacity 0.2s ease;
  transform-origin: bottom right;
}
.chat-panel-enter-from,
.chat-panel-leave-to {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}
</style>
