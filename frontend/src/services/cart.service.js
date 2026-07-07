// src/services/cart.service.js
import api from '@/lib/api'
import { useCartStore } from '@/stores/cart.store'

export const addItemToCart = async (payload) => {
  const { data } = await api.post('/carts/items', payload)
  // perbarui badge jumlah item di Navbar
  useCartStore().refresh()
  return data.data
}