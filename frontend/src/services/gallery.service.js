// src/services/gallery.service.js
import api from '@/lib/api'

/**
 * GET /galleries?search=&page=&limit=
 * Mengembalikan { message, data, meta } sesuai response backend.
 */
export const getGalleries = async (params = {}) => {
  const { data } = await api.get('/galleries', { params })
  return data
}

/**
 * GET /galleries/:id
 * Dipakai kalau butuh detail terbaru dari server (bukan dari list yang sudah ada di memori).
 */
export const getGalleryById = async (id) => {
  const { data } = await api.get(`/galleries/${id}`)
  return data.data
}

/**
 * POST /galleries (admin only)
 * payload: { title, imageUrl, description?, tags? }
 */
export const createGallery = async (payload) => {
  const { data } = await api.post('/galleries', payload)
  return data.data
}

/**
 * PATCH /galleries/:id (admin only)
 */
export const updateGallery = async (id, payload) => {
  const { data } = await api.patch(`/galleries/${id}`, payload)
  return data.data
}

/**
 * DELETE /galleries/:id (admin only)
 */
export const deleteGallery = async (id) => {
  await api.delete(`/galleries/${id}`)
}