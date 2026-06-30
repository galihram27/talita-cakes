// src/config/store.config.js

export const STORE_LOCATION = {
  lat: Number(process.env.STORE_LATITUDE),
  lng: Number(process.env.STORE_LONGITUDE),
};

// format internasional tanpa "+", contoh: 6281234567890
export const OWNER_WHATSAPP_NUMBER = process.env.OWNER_WHATSAPP_NUMBER;