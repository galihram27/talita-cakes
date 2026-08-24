// src/services/cart.service.js
import api from '@/lib/api'
import { useCartStore } from '@/stores/cart.store'

// Berbeda dari service lain yang hanya memanggil server, berkas ini juga
// memperbarui tampilan: setelah barang masuk, jumlah di navbar disegarkan
// dan ringkasan keranjang dibuka.

export const addItemToCart = async (payload) => {
  const { data } = await api.post('/carts/items', payload)
  const cart = useCartStore()
  // Tunggu penyegaran selesai dulu baru buka panelnya, supaya isinya sudah
  // lengkap saat muncul — bukan panel kosong yang terisi belakangan.
  await cart.refresh()
  cart.openMini()
  return data.data
}