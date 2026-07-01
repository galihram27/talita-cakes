import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";
import { CURRENT_TERMS_VERSION } from "../src/config/legal.config.js";

const seedAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE) {
    console.warn("⚠️  ADMIN_* env vars belum lengkap, skip seed admin.");
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // upsert biar seed aman dijalankan berkali-kali (idempotent)
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {}, // kalau sudah ada, jangan diubah — hindari re-hash password tiap run
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone: ADMIN_PHONE,
      role: "ADMIN",
      isVerified: true, // langsung verified, skip OTP sepenuhnya
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });

  console.log(`✅ Admin seeded: ${admin.email}`);
};

seedAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });