import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const key = process.env.GOOGLE_MAPS_API_KEY;
const placeId = process.env.GOOGLE_PLACE_ID;

const res = await fetch(
   `https://places.googleapis.com/v1/places/${placeId}?languageCode=id`,
   {
      headers: {
         "X-Goog-Api-Key": key,
         "X-Goog-FieldMask": "displayName,rating,userRatingCount",
      },
   }
);

console.log("HTTP status:", res.status);
const body = await res.text();
console.log("Full body:");
console.log(body);
