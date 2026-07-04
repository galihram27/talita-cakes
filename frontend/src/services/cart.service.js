// src/services/cart.service.js
import api from '@/lib/api'

export const addItemToCart = async (payload) => {
  const { data } = await api.post('/carts/items', payload)
  return data.data
}