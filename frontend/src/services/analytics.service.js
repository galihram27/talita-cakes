import api from '@/lib/api'

/**
 * GET /analytics/dashboard?from=&to=&groupBy=day|month
 */
export const getDashboardStats = async (params = {}) => {
  const { data } = await api.get('/analytics/dashboard', { params })
  return data.data
}
