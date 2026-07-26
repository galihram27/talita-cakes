import api from '@/lib/api'
import {
  getVisitorId,
  hasReportedThisSession,
  markReportedThisSession,
} from '@/lib/visitor'

/**
 * POST /analytics/visit — lapor kunjungan sekali per sesi tab.
 * Tidak pernah throw: kegagalan analytics tidak boleh mengganggu halaman.
 */
export const reportVisit = async () => {
  if (hasReportedThisSession()) return

  // tandai duluan supaya navigasi cepat tidak memicu request dobel
  markReportedThisSession()

  try {
    await api.post('/analytics/visit', { visitorId: getVisitorId() ?? undefined })
  } catch {
    // diamkan
  }
}

/**
 * GET /analytics/dashboard?from=&to=&groupBy=day|month
 */
export const getDashboardStats = async (params = {}) => {
  const { data } = await api.get('/analytics/dashboard', { params })
  return data.data
}
