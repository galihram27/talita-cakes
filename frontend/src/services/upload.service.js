// src/services/upload.service.js
import api from '@/lib/api'

// Unggah gambar ke Cloudinary lewat server. Yang dikembalikan alamat
// gambarnya — itulah yang disimpan ke database, bukan berkasnya.

export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('image', file)

  // Header Content-Type tidak diisi sendiri: peramban yang menentukannya,
  // lengkap dengan penanda pemisah yang dibutuhkan pengiriman berkas
  const { data } = await api.post('/uploads/images', formData)
  return data.data // { url, publicId }
}
