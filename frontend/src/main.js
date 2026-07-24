import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes, scrollBehavior, registerGuards } from './router'
import { setRouterInstance } from './router/holder'
import i18n from './i18n'
import './assets/main.css'

// ViteSSG membuat router (client: history API, prerender: memory) dari `routes`,
// merender tiap rute publik jadi HTML statis saat build, lalu meng-hydrate di
// client sehingga tetap terasa seperti SPA.
export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  ({ app, router, initialState }) => {
    const pinia = createPinia()
    app.use(pinia)
    app.use(i18n)

    registerGuards(router)
    setRouterInstance(router)

    // Hidrasi state Pinia: di server, snapshot state disematkan ke HTML;
    // di client, state dipulihkan dari snapshot itu supaya tidak refetch/flash.
    if (import.meta.env.SSR) {
      initialState.pinia = pinia.state.value
    } else {
      pinia.state.value = initialState.pinia || {}
    }
  }
)
