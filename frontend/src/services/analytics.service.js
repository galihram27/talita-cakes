import api from '@/lib/api'
import {
  getVisitorId,
  hasReportedThisSession,
  markReportedThisSession,
} from '@/lib/visitor'

/**
 * Lapor satu kunjungan ke server, paling banyak sekali per tab.
 *
 * Sengaja tidak pernah melempar error: pencatatan pengunjung itu urusan
 * sampingan, jadi kegagalannya tidak boleh sampai merusak halaman yang
 * sedang dilihat orang.
 */
export const reportVisit = async () => {
  if (hasReportedThisSession()) return

  // Ditandai lebih dulu, sebelum permintaannya dikirim. Kalau ditandai
  // belakangan, pengunjung yang cepat berpindah halaman bisa terhitung dua kali.
  markReportedThisSession()

  try {
    await api.post('/analytics/visit', { visitorId: getVisitorId() ?? undefined })
  } catch {
    // Sengaja didiamkan, lihat penjelasan di atas
  }
}

// Data grafik untuk dashboard admin. Rentang tanggal & pengelompokan
// (harian/bulanan) dikirim sebagai parameter.
export const getDashboardStats = async (params = {}) => {
  const { data } = await api.get('/analytics/dashboard', { params })
  return data.data
}
