// src/services/gallery.service.js
import api from '@/lib/api'

// Pemanggilan endpoint galeri. Membaca terbuka untuk umum; menambah,
// mengubah, dan menghapus hanya bisa dilakukan admin.

// Daftar foto galeri, bisa dicari & dibagi per halaman.
// Ini satu-satunya yang mengembalikan respons utuh, karena pemanggilnya
// juga butuh `meta` berisi jumlah total & jumlah halaman.
export const getGalleries = async (params = {}) => {
  const { data } = await api.get('/galleries', { params })
  return data
}

// Satu foto, diambil langsung dari server. Dipakai kalau butuh data
// terbaru, bukan yang sudah terlanjur ada di daftar.
export const getGalleryById = async (id) => {
  const { data } = await api.get(`/galleries/${id}`)
  return data.data
}

// Tambah foto baru (admin). payload: { title, imageUrl, description?, tags? }
export const createGallery = async (payload) => {
  const { data } = await api.post('/galleries', payload)
  return data.data
}

// Ubah sebagian data foto (admin)
export const updateGallery = async (id, payload) => {
  const { data } = await api.patch(`/galleries/${id}`, payload)
  return data.data
}

// Hapus foto (admin)
export const deleteGallery = async (id) => {
  await api.delete(`/galleries/${id}`)
}