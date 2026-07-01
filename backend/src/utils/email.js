import { resend } from "./resend.js";
import { buildOtpEmailHtml } from "./email.templates.js";

export const sendOtpEmail = async ({ to, name, code, purpose }) => {
  const subject =
    purpose === "EMAIL_VERIFICATION"
      ? "Kode Verifikasi Email - Talita Cakes"
      : "Kode Reset Password - Talita Cakes";

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    html: buildOtpEmailHtml({ code, purpose, name }),
  });
};