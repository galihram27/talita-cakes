import "../src/config/env.js"; // wajib duluan: load .env sebelum prisma baca DATABASE_URL
import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";
import { CURRENT_TERMS_VERSION } from "../src/config/legal.config.js";

const seedUser = async () => {
   const name = "Galih";
   const email = "galih@email.com";
   const password = "galih123";
   const phone = "081234567890";

   const hashedPassword = await bcrypt.hash(password, 10);

   // upsert biar seed aman dijalankan berkali-kali (idempotent)
   const user = await prisma.user.upsert({
      where: { email },
      update: {
         isVerified: true,
         role: "USER",
      },
      create: {
         name,
         email,
         password: hashedPassword,
         phone,
         role: "USER",
         isVerified: true,
         termsAcceptedAt: new Date(),
         termsVersion: CURRENT_TERMS_VERSION,
      },
   });

   console.log(`✅ User seeded: ${user.email}`);
};

seedUser()
   .catch((e) => {
      console.error(e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
