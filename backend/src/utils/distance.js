// src/utils/distance.js

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Hitung jarak garis lurus (bukan jarak jalan/rute) antara 2 titik koordinat.
 * Dipakai sebagai FALLBACK kalau OpenRouteService tidak tersedia / gagal.
 */
export const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

// Endpoint OpenRouteService Matrix. Profil driving-car = jarak rute mengikuti
// jalan (untuk tarif ongkir berjenjang, praktis setara jalur motor).
const ORS_MATRIX_URL =
  'https://api.openrouteservice.org/v2/matrix/driving-car';

// Timeout panggilan API supaya checkout tidak menggantung kalau ORS lambat.
const ROUTE_API_TIMEOUT_MS = 8000;

/**
 * Hitung jarak rute jalan (km) via OpenRouteService Matrix API.
 * Mengembalikan angka km bila sukses, atau `null` bila:
 * - ORS_API_KEY belum di-set,
 * - API error / timeout / kena limit harian,
 * - rute tidak ditemukan.
 * Caller wajib menyiapkan fallback (lihat getDeliveryDistanceKm).
 *
 * Catatan: ORS memakai urutan koordinat [longitude, latitude] (bukan lat,lng).
 */
const getRouteDistanceKmOrs = async (lat1, lng1, lat2, lng2) => {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ORS_MATRIX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        // urutan ORS: [lng, lat]
        locations: [
          [lng1, lat1],
          [lng2, lat2],
        ],
        sources: [0], // dari toko
        destinations: [1], // ke lokasi pelanggan
        metrics: ['distance'],
        units: 'km',
      }),
      signal: AbortSignal.timeout(ROUTE_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[distance] ORS Matrix HTTP ${res.status} -> fallback garis lurus. ${body.slice(0, 200)}`
      );
      return null;
    }

    const data = await res.json();
    // distances = [[jarak_toko_ke_pelanggan]] (km, karena units: 'km')
    const km = data?.distances?.[0]?.[0];

    if (typeof km !== 'number' || Number.isNaN(km)) {
      console.warn(
        '[distance] ORS Matrix: jarak tidak valid / rute tidak ditemukan -> fallback garis lurus'
      );
      return null;
    }

    return km;
  } catch (err) {
    console.warn(
      `[distance] ORS Matrix error: ${err.message} -> fallback garis lurus`
    );
    return null;
  }
};

/**
 * Jarak untuk perhitungan ongkir: pakai rute jalan (OpenRouteService) bila bisa,
 * kalau tidak jatuh ke jarak garis lurus (haversine) supaya checkout tetap jalan.
 */
export const getDeliveryDistanceKm = async (lat1, lng1, lat2, lng2) => {
  const routeKm = await getRouteDistanceKmOrs(lat1, lng1, lat2, lng2);
  if (routeKm != null) return routeKm;
  return calculateDistanceKm(lat1, lng1, lat2, lng2);
};
