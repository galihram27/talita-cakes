// src/services/chat.service.js
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import i18n from '@/i18n'

/**
 * Pemanggilan endpoint asisten belanja.
 *
 * Status cukup lewat `api` biasa. Pengiriman pesan TIDAK bisa, karena axios
 * di peramban tidak bisa membaca jawaban sedikit demi sedikit — jadi dipakai
 * `fetch`, dan dua hal yang biasanya diurus lib/api.js harus dikerjakan
 * sendiri di sini: alamat server dan header Authorization.
 */

// Diambil dari axios supaya alamat server tetap diatur di satu tempat
const baseURL = api.defaults.baseURL

// Apakah fitur chat sedang dinyalakan di server (saklar CHAT_ENABLED)
export const getChatStatus = async () => {
  const { data } = await api.get('/chat/status')
  return data.data.enabled
}

// Isi token berupa JSON base64url di bagian tengahnya; cukup dibaca, tidak
// perlu diverifikasi — server yang memeriksa keasliannya.
const tokenExpiresAt = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).exp * 1000
  } catch {
    return 0
  }
}

/**
 * Token yang masih berlaku, atau null untuk tamu.
 *
 * Token kedaluwarsa tidak ditolak server chat, melainkan diam-diam dianggap
 * tamu — pembeli yang sudah login lalu tiba-tiba "belum login" saat bertanya
 * soal pesanannya. Karena `fetch` tidak melewati penanganan token basi di
 * lib/api.js, token diperbarui sendiri di sini sebelum dipakai.
 */
const freshAccessToken = async () => {
  const authStore = useAuthStore()
  const token = authStore.accessToken
  if (!token) return null

  // Diberi jeda 30 detik supaya token tidak habis di tengah jalan
  if (tokenExpiresAt(token) - Date.now() > 30_000) return token

  try {
    const { data } = await api.post('/auth/refresh-token')
    authStore.setAccessToken(data.data.accessToken)
    return data.data.accessToken
  } catch {
    // Sesi memang sudah habis. Tetap bertanya sebagai tamu; urusan
    // mengantar ke halaman login biar ditangani halaman lain.
    return null
  }
}

/**
 * Kesalahan dengan pesan yang aman ditampilkan ke pembeli. `status` dipakai
 * widget untuk memutuskan perlu menawarkan WhatsApp atau tidak.
 */
export class ChatError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

/**
 * Kirim percakapan dan terima jawabannya bertahap.
 *
 * `onDelta` dipanggil untuk setiap potongan teks. Janji selesai saat server
 * mengirim `done`. Membatalkan `signal` ikut menghentikan request server ke
 * penyedia model, jadi tidak ada token yang terbuang.
 *
 * Kegagalan datang dari dua arah (lihat chat.controller.js di backend):
 * sebelum kata pertama sebagai JSON biasa dengan status HTTP, sesudahnya
 * sebagai event `error` di dalam stream.
 */
export const streamChat = async (messages, { onDelta, signal } = {}) => {
  const token = await freshAccessToken()

  let response
  try {
    response = await fetch(`${baseURL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      // Bahasa situs dipakai server kalau bahasa pesan pembeli tidak jelas
      body: JSON.stringify({ messages, locale: i18n.global.locale.value }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ChatError('Tidak bisa terhubung ke server. Periksa koneksi internetmu.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ChatError(body?.message || 'Asisten sedang tidak bisa menjawab.', response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // Satu event SSE diakhiri baris kosong. Potongan dari jaringan bisa
  // memotong event di mana saja, jadi sisanya ditahan di `buffer` sampai
  // lengkap.
  const handleEvent = (raw) => {
    let event = 'message'
    let data = ''
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    const payload = data ? JSON.parse(data) : {}

    if (event === 'delta') onDelta?.(payload.text)
    else if (event === 'error') throw new ChatError(payload.message || 'Asisten sedang tidak bisa menjawab.')
    else if (event === 'done') return true
    return false
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    let boundary
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      if (handleEvent(raw)) return
    }
  }

  // Koneksi tertutup tanpa `done`: server mati atau jaringan putus di
  // tengah jawaban
  throw new ChatError('Jawaban terputus. Coba kirim ulang.')
}
