// src/stores/chat.store.js
import { defineStore } from 'pinia'
import { getChatStatus, streamChat } from '@/services/chat.service'

/**
 * Percakapan dengan asisten belanja.
 *
 * Riwayatnya disimpan di sessionStorage, bukan di server: pindah halaman atau
 * memuat ulang tidak menghapusnya, tapi menutup tab menghapusnya. Model tidak
 * punya ingatan, jadi seluruh riwayat dikirim ulang setiap kali bertanya.
 */

const STORAGE_KEY = 'talita_chat'

// Sama dengan batas di backend chat.validation.js. Riwayat yang lebih
// panjang dari ini ditolak server, bukan dipangkas.
const MAX_HISTORY = 20
const MAX_ASSISTANT_LENGTH = 4000
export const MAX_USER_LENGTH = 1000

const loadMessages = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

/**
 * Riwayat yang layak dikirim ke server.
 *
 * Jawaban yang gagal atau terpotong dibuang: kalau ikut terkirim, model akan
 * menganggap kalimat setengah jadi itu jawabannya sendiri dan
 * melanjutkannya. Jawaban asisten yang sangat panjang dipotong supaya lolos
 * validasi — sisanya jarang penting untuk memahami pertanyaan berikutnya.
 */
const toHistory = (messages) =>
  messages
    .filter((m) => !m.failed && m.text.trim())
    .map((m) => ({
      role: m.role,
      text: m.role === 'assistant' ? m.text.slice(0, MAX_ASSISTANT_LENGTH) : m.text,
    }))
    .slice(-MAX_HISTORY)

// Pengendali batal request yang sedang berjalan. Disimpan di luar state
// karena bukan data yang perlu ditampilkan atau disimpan.
let controller = null

export const useChatStore = defineStore('chat', {
  state: () => ({
    // null = belum dicek. Widget baru muncul setelah server bilang menyala,
    // supaya tombolnya tidak muncul lalu hilang lagi.
    enabled: null,
    isOpen: false,
    messages: [], // { role: 'user' | 'assistant', text, failed? }
    // 'idle' | 'waiting' (belum ada kata pertama) | 'streaming'
    status: 'idle',
    // { message, status } dari kegagalan terakhir, ditampilkan di bawah
    // percakapan
    error: null,
  }),

  getters: {
    isBusy: (state) => state.status !== 'idle',
  },

  actions: {
    /**
     * Dipanggil sekali saat widget terpasang di peramban. Tidak dipanggil
     * saat pra-render, karena di sana tidak ada sessionStorage maupun server.
     */
    async init() {
      this.messages = loadMessages()
      try {
        this.enabled = await getChatStatus()
      } catch {
        // Server tidak terjangkau: lebih baik tombolnya tidak muncul daripada
        // muncul lalu setiap pertanyaan gagal
        this.enabled = false
      }
    },

    persist() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages))
      } catch {
        // Penyimpanan penuh atau diblokir (mode privat). Percakapan tetap
        // jalan, hanya tidak bertahan saat halaman dimuat ulang.
      }
    },

    open() {
      this.isOpen = true
    },

    close() {
      this.isOpen = false
    },

    async send(text) {
      text = text.trim().slice(0, MAX_USER_LENGTH)
      if (!text || this.isBusy) return

      this.error = null
      this.messages.push({ role: 'user', text })
      this.status = 'waiting'
      this.persist()

      const history = toHistory(this.messages)
      // Ditambahkan kosong dulu lalu diisi potongan demi potongan. Diambil
      // lagi dari array (bukan objek aslinya) supaya perubahannya reaktif.
      this.messages.push({ role: 'assistant', text: '' })
      const reply = this.messages[this.messages.length - 1]

      controller = new AbortController()
      try {
        await streamChat(history, {
          signal: controller.signal,
          onDelta: (delta) => {
            this.status = 'streaming'
            reply.text += delta
          },
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Selain ChatError (mis. bug parsing) tidak punya code
          this.error = { code: err.code || 'generic', status: err.status || 0 }
        }
        reply.failed = true
      } finally {
        controller = null
        this.status = 'idle'
        // Jawaban yang gagal sebelum sempat berisi tidak ada gunanya tampil
        if (!reply.text) this.messages.pop()
        this.persist()
      }
    },

    // Hentikan jawaban yang sedang ditulis. Bagian yang sudah tampil tetap
    // dibiarkan, hanya tidak ikut dikirim sebagai riwayat.
    stop() {
      controller?.abort()
    },

    // Kirim ulang pertanyaan terakhir setelah gagal
    retry() {
      const lastUser = [...this.messages].reverse().find((m) => m.role === 'user')
      if (!lastUser || this.isBusy) return
      // Pertanyaan itu dikeluarkan dulu supaya tidak tercatat dua kali
      this.messages.splice(this.messages.lastIndexOf(lastUser))
      this.send(lastUser.text)
    },

    /**
     * Mulai percakapan baru. Dipanggil juga saat keluar akun, karena
     * percakapan bisa memuat daftar pesanan pembeli tadi.
     */
    reset() {
      controller?.abort()
      this.messages = []
      this.error = null
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Tidak bisa diakses, berarti memang tidak ada yang tersimpan
      }
    },
  },
})
