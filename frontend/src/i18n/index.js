import { createI18n } from "vue-i18n";
import en from "@/locales/en";
import id from "@/locales/id";
// Teks Home (ID) dipisah ke file sendiri agar mudah diedit owner tanpa
// menyentuh id.js. File ini menimpa bagian `home` di id.js.
import idHome from "@/locales/id/home.js";

// Gabungkan: pakai semua teks id.js, tapi bagian `home` diambil dari idHome.
const idMessages = { ...id, home: idHome };

const STORAGE_KEY = "talita_locale";

const savedLocale = localStorage.getItem(STORAGE_KEY);
const defaultLocale =
  savedLocale === "en" || savedLocale === "id" ? savedLocale : "id";

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLocale,
  fallbackLocale: "en",
  messages: { en, id: idMessages },
});

export function setLocale(locale) {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.setAttribute("lang", locale);
}

// util untuk kode di luar komponen (stores/services)
export const t = (key, ...args) => i18n.global.t(key, ...args);

document.documentElement.setAttribute("lang", defaultLocale);

export default i18n;
