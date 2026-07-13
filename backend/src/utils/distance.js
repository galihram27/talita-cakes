// src/utils/distance.js

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Hitung jarak garis lurus (bukan jarak jalan/rute) antara 2 titik koordinat.
 * Dipakai sebagai FALLBACK kalau HERE Routing tidak tersedia / gagal.
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

// Endpoint HERE Routing v8. transportMode=scooter = rute kendaraan roda dua
// (motor/skuter), lebih akurat untuk ongkir dibanding profil mobil.
const HERE_ROUTES_URL = 'https://router.hereapi.com/v8/routes';

// Timeout panggilan API supaya checkout tidak menggantung kalau HERE lambat.
const ROUTE_API_TIMEOUT_MS = 8000;

/**
 * Hitung jarak rute motor (km) via HERE Routing API (mode scooter).
 * Mengembalikan angka km bila sukses, atau `null` bila:
 * - HERE_API_KEY belum di-set,
 * - API error / timeout / kena limit,
 * - rute tidak ditemukan.
 * Caller wajib menyiapkan fallback (lihat getDeliveryDistanceKm).
 */
const getRouteDistanceKmHere = async (lat1, lng1, lat2, lng2) => {
  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      transportMode: 'scooter',
      origin: `${lat1},${lng1}`,
      destination: `${lat2},${lng2}`,
      return: 'summary', // cukup ringkasan (panjang & durasi), tanpa geometri
      apikey: apiKey,
    });

    const res = await fetch(`${HERE_ROUTES_URL}?${params.toString()}`, {
      method: 'GET',
      signal: AbortSignal.timeout(ROUTE_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[distance] HERE Routing HTTP ${res.status} -> fallback garis lurus. ${body.slice(0, 200)}`
      );
      return null;
    }

    const data = await res.json();
    const sections = data?.routes?.[0]?.sections;

    if (!Array.isArray(sections) || sections.length === 0) {
      console.warn(
        '[distance] HERE Routing: rute tidak ditemukan -> fallback garis lurus'
      );
      return null;
    }

    // total panjang (meter) = jumlah length semua section rute
    const meters = sections.reduce(
      (sum, s) => sum + (s?.summary?.length ?? 0),
      0
    );

    if (!meters || meters <= 0) {
      console.warn(
        '[distance] HERE Routing: panjang rute tidak valid -> fallback garis lurus'
      );
      return null;
    }

    return meters / 1000;
  } catch (err) {
    console.warn(
      `[distance] HERE Routing error: ${err.message} -> fallback garis lurus`
    );
    return null;
  }
};

/**
 * Jarak untuk perhitungan ongkir: pakai rute motor (HERE, mode scooter) bila bisa,
 * kalau tidak jatuh ke jarak garis lurus (haversine) supaya checkout tetap jalan.
 */
export const getDeliveryDistanceKm = async (lat1, lng1, lat2, lng2) => {
  const routeKm = await getRouteDistanceKmHere(lat1, lng1, lat2, lng2);
  if (routeKm != null) return routeKm;
  return calculateDistanceKm(lat1, lng1, lat2, lng2);
};
