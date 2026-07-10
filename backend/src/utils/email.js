import { resend } from "./resend.js";
import { buildOtpEmailHtml } from "./email.templates.js";

export const sendOtpEmail = async ({ to, name, code, purpose }) => {
  const subject =
    purpose === "EMAIL_VERIFICATION"
      ? "Kode Verifikasi Email - Talita Cakes"
      : "Kode Reset Password - Talita Cakes";

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    html: buildOtpEmailHtml({ code, purpose, name }),
  });

  // Resend tidak melempar error; ia mengembalikannya di { error }.
  // Kalau diabaikan, pengiriman gagal tanpa ketahuan.
  if (error) {
    console.error("Gagal kirim email OTP via Resend:", error);
    throw new Error(error.message || "Gagal mengirim email OTP");
  }
};