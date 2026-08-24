import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes, scrollBehavior, registerGuards } from './router'
import { setRouterInstance } from './router/holder'
import i18n from './i18n'
import './assets/main.css'

/**
 * Titik awal aplikasi.
 *
 * Situs ini dibangun dengan cara khusus: saat proses build, tiap halaman
 * publik dijalankan lebih dulu lalu hasilnya disimpan sebagai berkas HTML.
 * Jadi mesin pencari dan pengunjung sama-sama langsung menerima halaman jadi,
 * bukan halaman kosong yang baru terisi setelah JavaScript berjalan.
 *
 * Setelah halaman terbuka, aplikasi mengambil alih dan berpindah halaman
 * tanpa memuat ulang, seperti aplikasi biasa.
 */
export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ app, router, initialState }) => {
    const pinia = createPinia()
    app.use(pinia)
    app.use(i18n)

    registerGuards(router)
    // Titipkan router supaya bisa dipakai kode yang bukan komponen,
    // lihat router/holder.js
    setRouterInstance(router)

    /**
     * Pindahkan data dari proses build ke peramban.
     *
     * Saat halaman dibangun, data yang sempat terkumpul disisipkan ke dalam
     * HTML-nya. Saat halaman dibuka pengunjung, data itu dipungut kembali —
     * jadi aplikasi tidak perlu mengambil ulang data yang sama, dan halaman
     * tidak berkedip dari kosong ke terisi.
     */
    if (import.meta.env.SSR) {
      initialState.pinia = pinia.state.value
    } else {
      pinia.state.value = initialState.pinia || {}
    }
  }
)
