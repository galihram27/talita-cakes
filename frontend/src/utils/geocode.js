// src/utils/geocode.js
// Semua urusan alamat <-> koordinat untuk peta checkout.
//
// Provider: MapTiler kalau VITE_MAPTILER_KEY terisi (key yang sama dengan style
// peta, free tier-nya mengizinkan autocomplete), jatuh ke Nominatim/OSM kalau
// kosong supaya pencarian tetap jalan tanpa key.

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || ''

// Hasil dibatasi Indonesia — toko hanya melayani radius 25 km dari Depok,
// jadi kandidat luar negeri hanya bikin daftar saran berisik.
const COUNTRY = 'id'
const RESULT_LIMIT = 5

const EARTH_RADIUS_KM = 6371
const toRad = (deg) => (deg * Math.PI) / 180

// Jarak garis lurus antar 2 koordinat — hanya untuk mengurutkan saran.
// Jarak & ongkir yang sebenarnya tetap dihitung backend (jarak rute motor).
const straightLineKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Cari alamat -> daftar kandidat lokasi.
 * `proximity` ({ lat, lng }) = titik acuan (lokasi toko): dipakai untuk membias
 * hasil dari provider DAN mengurutkan kandidat dari yang terdekat.
 *
 * Urutan dari provider tidak dipakai apa adanya karena bias jaraknya lemah:
 * query "jalan merdeka" mengembalikan Jalan Merdeka Bogor (±25 km, di luar
 * radius antar) di atas Jalan Merdeka Depok (±1 km, jelas yang dimaksud).
 * Karena antar dibatasi radius 25 km dari toko, yang terdekat hampir selalu
 * yang dicari user.
 *
 * Mengembalikan array { id, label, lat, lng }. Query kosong -> array kosong.
 * `signal` (AbortSignal) dipakai pemanggil untuk membatalkan request lama
 * saat user masih mengetik.
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
 * Koordinat -> alamat teks. Dipakai saat user klik peta / geser marker.
 * Mengembalikan string alamat, atau '' kalau tidak ketemu.
 */
export const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const result = await res.json()
  return result?.display_name || ''
}

// ===== MAPTILER =====

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
    // center = [lng, lat]
    .filter((f) => Array.isArray(f.center) && f.center.length === 2)
    .map((f) => ({
      id: String(f.id),
      label: f.place_name || f.text || '',
      lat: f.center[1],
      lng: f.center[0],
    }))

// ===== NOMINATIM (fallback tanpa key) =====

const buildNominatimSearchUrl = (q, proximity) => {
  const params = new URLSearchParams({
    format: 'json',
    q,
    limit: String(RESULT_LIMIT),
    countrycodes: COUNTRY,
    addressdetails: '1',
  })
  // Nominatim tidak punya parameter proximity; kotak ±0.5° (~55 km) di sekitar
  // toko dipakai untuk mendekatkan hasil. bounded=0 = kotak hanya memprioritaskan,
  // bukan membuang hasil di luarnya.
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
