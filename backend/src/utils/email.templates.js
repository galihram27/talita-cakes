export const buildOtpEmailHtml = ({ code, purpose, name }) => {
  const title =
    purpose === "EMAIL_VERIFICATION"
      ? "Verifikasi Email Kamu"
      : "Reset Password";

  const description =
    purpose === "EMAIL_VERIFICATION"
      ? "Gunakan kode di bawah ini untuk memverifikasi email kamu di Talita Cakes."
      : "Gunakan kode di bawah ini untuk mereset password akun Talita Cakes kamu.";

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${title}</h2>
      <p>Hai ${name || ""},</p>
      <p>${description}</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0; text-align: center;">
        ${code}
      </div>
      <p>Kode ini berlaku selama 10 menit. Jangan bagikan kode ini ke siapa pun.</p>
      <p>Kalau kamu tidak merasa melakukan permintaan ini, abaikan saja email ini.</p>
    </div>
  `;
};