// src/services/order.service.js
import api from '@/lib/api'

// Ubah status pesanan dari halaman admin.
// Nilainya salah satu dari: PENDING, CONFIRMED, CANCELLED, COMPLETED.
//
// Hanya ini yang ada di sini karena pembuatan pesanan tidak lewat service —
// halaman checkout memanggil server secara langsung.
export const updateOrderStatus = async (id, status) => {
  const { data } = await api.patch(`/orders/admin/${id}/status`, { status })
  return data.data
}
