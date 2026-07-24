// Penampung instance router yang dibuat ViteSSG di main.js.
// Dipakai kode non-komponen (mis. interceptor axios di lib/api.js) untuk
// navigasi tanpa perlu membuat instance router sendiri — yang justru akan
// berbeda dari router yang dipakai aplikasi.
let _router = null

export const setRouterInstance = (router) => {
  _router = router
}

export const getRouterInstance = () => _router
