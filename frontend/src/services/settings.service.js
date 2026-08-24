// src/services/settings.service.js
import api from '@/lib/api'

// Pengaturan situs yang bisa diubah admin tanpa deploy ulang,
// mis. gambar utama halaman depan.

// Baca satu pengaturan. null berarti belum pernah diisi.
export const getSetting = async (key) => {
  const { data } = await api.get(`/settings/${key}`)
  return data.data?.value ?? null
}

// Simpan nilai baru (admin)
export const updateSetting = async (key, value) => {
  const { data } = await api.put(`/settings/${key}`, { value })
  return data.data // { key, value }
}
