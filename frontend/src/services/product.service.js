// src/services/product.service.js
import api from '@/lib/api'

export const getAllProducts = async () => {
  const { data } = await api.get('/products')
  return data.data
}

// Hanya mengambil ANGKA jumlah produk (untuk stat card dashboard),
// tanpa menarik seluruh katalog + varian + gambar.
export const getProductCount = async (category) => {
  const { data } = await api.get('/products/count', {
    params: category ? { category } : undefined,
  })
  return data.data.count
}

export const getProductById = async (id) => {
  const { data } = await api.get(`/products/${id}`)
  return data.data
}

export const createProduct = async (payload) => {
  const { data } = await api.post('/products', payload)
  return data.data
}

export const updateProduct = async (id, payload) => {
  const { data } = await api.patch(`/products/${id}`, payload)
  return data.data
}

export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`)
  return data
}