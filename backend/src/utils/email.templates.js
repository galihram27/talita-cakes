export const buildOtpEmailHtml = ({ code, purpose, name }) => {
  const title =
    purpose === "EMAIL_VERIFICATION"
      ? "Verifikasi Email Kamu"
      : "Reset Password";

  const description =
    purpose === "EMAIL_VERIFICATION"
      ? "Gunakan kode di bawah ini untuk memverifikasi email kamu di Talita Cakes."
      : "Gunakan kode di bawah ini untuk mereset password akun Talita Cakes kamu.";

  // Logo harus di-load dari URL HTTPS publik (Gmail tidak memuat gambar lokal
  // maupun data URI). Default: file logo.png yang di-serve frontend (Vercel) di
  // FRONTEND_URL/logo.png. Bisa dioverride lewat EMAIL_LOGO_URL kalau logonya
  // di-host di tempat lain (mis. Cloudinary).
  const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  const logoUrl =
    process.env.EMAIL_LOGO_URL || (frontendUrl ? `${frontendUrl}/logo.png` : "");

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Talita Cakes" width="120" style="display: block; margin: 0 auto 8px; width: 120px; max-width: 60%; height: auto;" />`
    : `<div style="font-size: 22px; font-weight: bold; color: #8a5a44; text-align: center;">Talita Cakes</div>`;

  return `
    <div style="background-color: #f5f0eb; padding: 32px 16px; font-family: 'Segoe UI', Arial, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <div style="padding: 28px 24px 8px; text-align: center;">
          ${logoBlock}
        </div>
        <div style="padding: 8px 32px 32px;">
          <h2 style="margin: 0 0 16px; font-size: 20px; color: #2b2b2b; text-align: center;">${title}</h2>
          <p style="margin: 0 0 8px; font-size: 15px; color: #444;">Hai ${name || ""},</p>
          <p style="margin: 0 0 20px; font-size: 15px; color: #444; line-height: 1.5;">${description}</p>
          <div style="font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #8a5a44; background-color: #f5f0eb; border-radius: 12px; padding: 18px 0; margin: 0 0 20px; text-align: center;">
            ${code}
          </div>
          <p style="margin: 0 0 8px; font-size: 13px; color: #777; line-height: 1.5;">Kode ini berlaku selama 10 menit. Jangan bagikan kode ini ke siapa pun.</p>
          <p style="margin: 0; font-size: 13px; color: #777; line-height: 1.5;">Kalau kamu tidak merasa melakukan permintaan ini, abaikan saja email ini.</p>
        </div>
        <div style="padding: 16px 24px; background-color: #faf7f3; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #999;">&copy; Talita Cakes</p>
        </div>
      </div>
    </div>
  `;
};
