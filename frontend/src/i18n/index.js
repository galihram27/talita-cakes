import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import id from '@/locales/id'
import idAbout from '@/locales/id/about.js'

/**
 * Pengaturan dua bahasa situs: Indonesia dan Inggris.
 *
 * Sebagian teks Indonesia dipisah ke folder locales/id/ — itu teks yang
 * sewaktu-waktu ingin disunting pemilik toko sendiri. Berkas di folder itu
 * MENIMPA bagian yang sama di id.js, sehingga id.js tidak perlu ikut diubah
 * dan tetap rapi sebagai daftar teks utuh.
 */
const idMessages = {
  ...id,
  about: idAbout,
}

const STORAGE_KEY = 'talita_locale'

/**
 * Bahasa yang dipakai saat halaman dibuka.
 *
 * Diambil dari pilihan terakhir pengunjung. Saat halaman dibangun jadi HTML
 * tidak ada peramban sehingga tidak ada pilihan tersimpan — di situ selalu
 * bahasa Indonesia.
 */
const savedLocale = import.meta.env.SSR
  ? null
  : localStorage.getItem(STORAGE_KEY)
const defaultLocale =
  savedLocale === 'en' || savedLocale === 'id' ? savedLocale : 'id'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLocale,
  // Teks yang belum diterjemahkan jatuh ke bahasa Inggris,
  // supaya tidak muncul kode kunci mentah di layar
  fallbackLocale: 'en',
  messages: { en, id: idMessages },
})

// Ganti bahasa sekaligus mengingatnya untuk kunjungan berikutnya.
// Penanda `lang` pada halaman ikut diperbarui — itu yang dipakai pembaca layar
// dan mesin pencari untuk mengetahui bahasa isinya.
export function setLocale(locale) {
  i18n.global.locale.value = locale
  if (!import.meta.env.SSR) {
    localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.setAttribute('lang', locale)
  }
}

// Untuk mengambil teks terjemahan dari luar komponen, mis. dari store
export const t = (key, ...args) => i18n.global.t(key, ...args)

// Pasang penanda bahasa awal saat halaman pertama kali dibuka
if (!import.meta.env.SSR) {
  document.documentElement.setAttribute('lang', defaultLocale)
}

export default i18n
