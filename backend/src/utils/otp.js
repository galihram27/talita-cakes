import bcrypt from "bcrypt";

export const OTP_LENGTH = 6;
export const OTP_EXPIRES_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const generateOtpCode = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

export const hashOtpCode = async (code) => bcrypt.hash(code, 10);

export const compareOtpCode = async (code, hashedCode) =>
  bcrypt.compare(code, hashedCode);