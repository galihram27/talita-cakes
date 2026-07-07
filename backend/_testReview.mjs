import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const { getGoogleReviews } = await import(
   "./src/features/review/review.service.js"
);

try {
   const result = await getGoogleReviews();
   console.log("SUCCESS");
   console.log("Place:", result.placeName);
   console.log("Rating:", result.rating, "| Total:", result.totalReviews);
   console.log("Maps URL:", result.googleMapsUrl);
   console.log("Jumlah review diterima:", result.reviews.length);
   result.reviews.forEach((r, i) => {
      console.log(`\n[${i + 1}] ${r.author} — ${r.rating} bintang (${r.relativeTime})`);
      console.log(r.text.slice(0, 120));
   });
} catch (err) {
   console.log("FAILED");
   console.log("Status:", err.statusCode);
   console.log("Message:", err.message);
}
