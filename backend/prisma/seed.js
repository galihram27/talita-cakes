import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

async function main() {
   const adminEmail = process.env.ADMIN_EMAIL;
   const adminPassword = process.env.ADMIN_PASSWORD;
   const adminPhone = process.env.ADMIN_PHONE;

   if (!adminEmail || !adminPassword) {
      throw new Error(
         "ADMIN_EMAIL dan ADMIN_PASSWORD harus diset di file .env"
      );
   }

   const hashedPassword = await bcrypt.hash(adminPassword, 10);

   const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
         name: "Admin",
         email: adminEmail,
         password: hashedPassword,
         phone: adminPhone,
         role: "ADMIN",
      },
   });

   console.log("Admin berhasil dibuat:", admin);
}

main()
   .catch((e) => {
      console.error(e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
