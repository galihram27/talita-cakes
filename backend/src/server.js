import "./config/env.js";
import app from "./app.js";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//    console.log(`Server running on port ${PORT}`);
// });

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});