import AppError from "../../utils/appError.js";

// Google Places API (New) — Place Details
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-details
const PLACES_API_BASE = "https://places.googleapis.com/v1/places";

// Google hanya mengembalikan maksimal 5 review, jadi hasilnya di-cache
// agar tidak memanggil API (berbayar) di setiap request.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 jam

let cache = {
   data: null,
   expiresAt: 0,
};

export const getGoogleReviews = async () => {
   const apiKey = process.env.GOOGLE_MAPS_API_KEY;
   const placeId = process.env.GOOGLE_PLACE_ID;

   if (!apiKey || !placeId) {
      throw new AppError(
         "Google reviews belum dikonfigurasi (GOOGLE_MAPS_API_KEY / GOOGLE_PLACE_ID)",
         503
      );
   }

   if (cache.data && Date.now() < cache.expiresAt) {
      return cache.data;
   }

   const url = `${PLACES_API_BASE}/${placeId}?languageCode=id`;
   const response = await fetch(url, {
      headers: {
         "X-Goog-Api-Key": apiKey,
         "X-Goog-FieldMask":
            "displayName,rating,userRatingCount,googleMapsUri,reviews",
      },
   });

   if (!response.ok) {
      const body = await response.text();
      console.error("Google Places API error:", response.status, body);

      // Kalau cache lama masih ada, pakai itu daripada gagal total
      if (cache.data) return cache.data;

      throw new AppError("Gagal mengambil review dari Google", 502);
   }

   const place = await response.json();

   const result = {
      placeName: place.displayName?.text ?? null,
      rating: place.rating ?? null,
      totalReviews: place.userRatingCount ?? 0,
      googleMapsUrl: place.googleMapsUri ?? null,
      reviews: (place.reviews ?? []).map((review) => ({
         author: review.authorAttribution?.displayName ?? "Pengguna Google",
         authorPhoto: review.authorAttribution?.photoUri ?? null,
         authorUrl: review.authorAttribution?.uri ?? null,
         rating: review.rating,
         text: review.text?.text ?? "",
         relativeTime: review.relativePublishTimeDescription ?? "",
         publishTime: review.publishTime ?? null,
      })),
   };

   cache = {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
   };

   return result;
};
