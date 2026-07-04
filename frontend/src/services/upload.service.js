// src/services/upload.service.js
import api from '@/lib/api'

export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('image', file)

  const { data } = await api.post('/uploads/images', formData)
  return data.data // { url, publicId }
}
