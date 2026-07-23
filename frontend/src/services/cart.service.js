// src/services/cart.service.js
import api from '@/lib/api'
import { useCartStore } from '@/stores/cart.store'

export const addItemToCart = async (payload) => {
  const { data } = await api.post('/carts/items', payload)
  const cart = useCartStore()
  // perbarui badge jumlah item di Navbar, lalu tampilkan mini keranjang
  // (tunggu refresh dulu agar isi panel sudah lengkap saat muncul).
  await cart.refresh()
  cart.openMini()
  return data.data
}