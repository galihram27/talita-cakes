import { z } from "zod";

// Nama: harus diawali huruf kapital, hanya huruf & spasi
const nameSchema = z
   .string()
   .min(1, "Name is required")
   .regex(
      /^[A-Z][a-zA-Z\s]*$/,
      "Name must start with a capital letter and contain only letters"
   );

// Email: wajib ada @
const emailSchema = z
   .string()
   .min(1, "Email is required")
   .email("Invalid email format");

// Password:
// - 6–20 karakter
// - harus diawali huruf
// - minimal 1 angka
const passwordSchema = z
   .string()
   .min(6, "Password must be at least 6 characters")
   .max(20, "Password must be at most 20 characters")
   .regex(/^[A-Za-z]/, "Password must start with a letter")
   .regex(/\d/, "Password must contain at least one number");

// Phone
const phoneSchema = z.string().min(8, "Phone number is too short");

const acceptedTermsSchema = z
   .boolean({ message: "acceptedTerms wajib diisi" })
   .refine((val) => val === true, {
      message: "Kamu harus menyetujui Terms of Use & Privacy Policy",
   });

// REGISTER VALIDATION
export const registerSchema = z.object({
   name: nameSchema,
   email: emailSchema,
   password: passwordSchema,
   phone: phoneSchema,
   acceptedTerms: acceptedTermsSchema,
});

// LOGIN VALIDATION
export const loginSchema = z.object({
   email: emailSchema,
   password: z.string().min(1, "Password is required"),
});

// OTP VALIDATION
export const verifyEmailSchema = z.object({
   email: emailSchema,
   code: z.string().length(6, "Kode OTP harus 6 digit"),
});

export const resendOtpSchema = z.object({
   email: emailSchema,
   purpose: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
});

export const forgotPasswordSchema = z.object({
   email: emailSchema,
});

export const resetPasswordSchema = z.object({
   email: emailSchema,
   code: z.string().length(6, "Kode OTP harus 6 digit"),
   newPassword: passwordSchema,
});