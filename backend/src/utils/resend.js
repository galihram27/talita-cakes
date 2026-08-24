import { Resend } from "resend";

/**
 * Satu instance klien Resend (layanan pengiriman email) untuk seluruh aplikasi.
 * Dipisah ke file sendiri supaya tidak ada yang membuat instance baru
 * berulang kali. Pemakaiannya lihat email.js.
 */

export const resend = new Resend(process.env.RESEND_API_KEY);
