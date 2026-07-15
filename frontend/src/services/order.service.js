// src/services/order.service.js
import api from '@/lib/api'

/**
 * PATCH /orders/admin/:id/status (admin only)
 * status: PENDING | CONFIRMED | CANCELLED | COMPLETED
 */
export const updateOrderStatus = async (id, status) => {
  const { data } = await api.patch(`/orders/admin/${id}/status`, { status })
  return data.data
}
