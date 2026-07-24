// src/services/settings.service.js
import api from '@/lib/api'

// GET /settings/:key  → nilai (string) atau null bila belum diset.
export const getSetting = async (key) => {
  const { data } = await api.get(`/settings/${key}`)
  return data.data?.value ?? null
}

// PUT /settings/:key  (admin) → simpan nilai baru.
export const updateSetting = async (key, value) => {
  const { data } = await api.put(`/settings/${key}`, { value })
  return data.data // { key, value }
}
