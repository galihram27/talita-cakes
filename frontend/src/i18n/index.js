import { createI18n } from "vue-i18n";
import en from "@/locales/en";
import id from "@/locales/id";
// Teks yang bisa diedit owner (per halaman) ditaruh di folder locales/id/.
// File-file ini MENIMPA bagian yang sama di id.js. id.js sendiri tidak diubah.
import idAbout from "@/locales/id/about.js";

// Pakai semua teks id.js, lalu timpa bagian tertentu dengan file editable owner.
const idMessages = {
  ...id,
  about: idAbout,
};

const STORAGE_KEY = "talita_locale";

// Saat prerender (Node) tidak ada localStorage → default ke "id".
const savedLocale = import.meta.env.SSR
  ? null
  : localStorage.getItem(STORAGE_KEY);
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
  // localStorage & document hanya ada di browser
  if (!import.meta.env.SSR) {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.setAttribute("lang", locale);
  }
}

// util untuk kode di luar komponen (stores/services)
export const t = (key, ...args) => i18n.global.t(key, ...args);

if (!import.meta.env.SSR) {
  document.documentElement.setAttribute("lang", defaultLocale);
}

export default i18n;
