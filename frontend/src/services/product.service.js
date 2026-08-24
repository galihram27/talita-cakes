// src/services/product.service.js
import api from '@/lib/api'

// Pemanggilan endpoint produk. Membaca terbuka untuk umum; menambah,
// mengubah, dan menghapus hanya bisa dilakukan admin.

export const getAllProducts = async () => {
  const { data } = await api.get('/products')
  return data.data
}

// Cuma mengambil angkanya saja, untuk kartu ringkasan di dashboard.
// Dibuat terpisah supaya tidak perlu menarik seluruh katalog beserta
// varian & fotonya hanya demi satu angka.
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