// src/utils/geocode.js

/**
 * Pencarian alamat untuk peta di halaman checkout — dua arah: dari teks
 * alamat menjadi titik koordinat, dan sebaliknya.
 *
 * Ada dua penyedia layanan. MapTiler dipakai kalau kuncinya sudah diisi;
 * kalau belum, pencarian tetap berjalan memakai Nominatim yang tidak butuh
 * kunci sama sekali. Jadi fitur ini tidak pernah benar-benar mati, paling
 * banter hasilnya kurang bagus.
 */

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || ''

// Hasil dibatasi Indonesia saja. Toko cuma melayani radius 25 km dari Depok,
// jadi alamat luar negeri hanya membuat daftar saran penuh hal tak berguna.
const COUNTRY = 'id'
const RESULT_LIMIT = 5

const EARTH_RADIUS_KM = 6371
const toRad = (deg) => (deg * Math.PI) / 180

// Jarak garis lurus antar dua titik. HANYA untuk mengurutkan daftar saran —
// jarak yang menentukan ongkir tetap dihitung server memakai jarak jalan
// sungguhan, bukan angka dari sini.
const straightLineKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Cari alamat, hasilnya daftar kandidat lokasi.
 *
 * `proximity` adalah lokasi toko, dipakai dua kali: dikirim ke penyedia
 * layanan sebagai petunjuk, lalu dipakai lagi untuk mengurutkan hasilnya
 * sendiri di sini.
 *
 * Pengurutan ulang itu perlu karena petunjuk ke penyedia layanan pengaruhnya
 * lemah. Contoh nyata: mengetik "jalan merdeka" menempatkan Jalan Merdeka
 * Bogor — sekitar 25 km, sudah di tepi batas layanan — di atas Jalan Merdeka
 * Depok yang cuma 1 km dan jelas yang dimaksud. Karena pengantaran dibatasi
 * 25 km dari toko, yang terdekat hampir selalu yang dicari.
 *
 * `signal` dipakai pemanggil untuk membatalkan pencarian lama saat pengunjung
 * masih mengetik, supaya hasil ketikan lama tidak menimpa yang baru.
 */
export const searchAddress = async (query, { proximity, signal } = {}) => {
  const q = query.trim()
  if (!q) return []

  const url = MAPTILER_KEY
    ? buildMaptilerSearchUrl(q, proximity)
    : buildNominatimSearchUrl(q, proximity)

  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!res.ok) throw new Error(`Geocoding gagal (${res.status})`)

  const body = await res.json()
  const results = MAPTILER_KEY
    ? parseMaptilerResults(body)
    : parseNominatimResults(body)

  if (!proximity) return results

  return [...results].sort(
    (a, b) =>
      straightLineKm(proximity.lat, proximity.lng, a.lat, a.lng) -
      straightLineKm(proximity.lat, proximity.lng, b.lat, b.lng)
  )
}

/**
 * Kebalikannya: dari titik di peta menjadi teks alamat. Dipakai saat
 * pengunjung mengklik peta atau menggeser penanda lokasinya.
 *
 * Selalu memakai Nominatim, tidak peduli kunci MapTiler terisi atau tidak,
 * karena untuk keperluan ini hasilnya sudah memadai dan tidak memakan kuota.
 * Mengembalikan teks kosong kalau titik itu tidak dikenali.
 */
export const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const result = await res.json()
  return result?.display_name || ''
}

// =========================
// MAPTILER (dipakai kalau kuncinya terisi)
// =========================

const buildMaptilerSearchUrl = (q, proximity) => {
  const params = new URLSearchParams({
    key: MAPTILER_KEY,
    country: COUNTRY,
    limit: String(RESULT_LIMIT),
    autocomplete: 'true',
    language: 'id',
  })
  if (proximity) params.set('proximity', `${proximity.lng},${proximity.lat}`)
  return `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?${params}`
}

const parseMaptilerResults = (body) =>
  (body?.features ?? [])
    // Perhatikan urutannya: koordinat datang sebagai [bujur, lintang] —
    // kebalikan dari kebiasaan menulis lintang dulu
    .filter((f) => Array.isArray(f.center) && f.center.length === 2)
    .map((f) => ({
      id: String(f.id),
      label: f.place_name || f.text || '',
      lat: f.center[1],
      lng: f.center[0],
    }))

// =========================
// NOMINATIM (cadangan, tidak butuh kunci)
// =========================

const buildNominatimSearchUrl = (q, proximity) => {
  const params = new URLSearchParams({
    format: 'json',
    q,
    limit: String(RESULT_LIMIT),
    countrycodes: COUNTRY,
    addressdetails: '1',
  })
  // Nominatim tidak menerima "titik acuan" seperti MapTiler, jadi caranya
  // menggambar kotak sekitar 55 km mengelilingi toko. Angka 0 pada `bounded`
  // berarti kotak itu hanya mengutamakan, bukan membuang hasil di luarnya —
  // penting supaya alamat yang ditulis agak melenceng tetap bisa ketemu.
  if (proximity) {
    const d = 0.5
    params.set(
      'viewbox',
      `${proximity.lng - d},${proximity.lat + d},${proximity.lng + d},${proximity.lat - d}`
    )
    params.set('bounded', '0')
  }
  return `https://nominatim.openstreetmap.org/search?${params}`
}

const parseNominatimResults = (body) =>
  (Array.isArray(body) ? body : []).map((r) => ({
    id: String(r.place_id),
    label: r.display_name || '',
    lat: Number(r.lat),
    lng: Number(r.lon),
  }))
