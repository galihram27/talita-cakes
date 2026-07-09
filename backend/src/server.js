import "./config/env.js";
import app from "./app.js";
import { cleanupUnverifiedUsers } from "./features/auth/auth.service.js";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const PORT = process.env.PORT || 5000;

setInterval(() => {
  cleanupUnverifiedUsers().catch((err) => console.error("Cleanup gagal:", err));
}, 60 * 60 * 1000); // jalan tiap 1 jam

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});