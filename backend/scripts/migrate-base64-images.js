// scripts/migrate-base64-images.js
//
// Migrasi one-off: gambar yang terlanjur tersimpan sebagai base64 data URI
// di database (products.image, products.images, galleries.imageUrl) di-upload
// ke Cloudinary, lalu kolomnya diganti dengan URL Cloudinary.
//
// Kenapa: base64 di DB membuat respons /products membengkak (21 MB untuk
// 4 produk) sehingga halaman admin & menu lambat. Setelah migrasi, respons
// hanya berisi URL pendek.
//
// Aman dijalankan ulang (idempotent): baris yang sudah berupa URL dilewati.
// Sebelum mengubah apa pun, nilai lama di-backup ke file JSON di folder ini.
//
// Cara pakai:  node scripts/migrate-base64-images.js   (dari folder backend)

import "../src/config/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../src/lib/prisma.js";
import { uploadImageBuffer } from "../src/utils/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDataUri = (v) => typeof v === "string" && v.startsWith("data:");

const dataUriToBuffer = (uri) =>
   Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");

const main = async () => {
   // ===== 1. Kumpulkan baris yang masih menyimpan base64 =====
   const products = (
      await prisma.product.findMany({
         select: { id: true, name: true, image: true, images: true },
      })
   ).filter((p) => isDataUri(p.image) || (p.images ?? []).some(isDataUri));

   const galleries = (
      await prisma.gallery.findMany({
         select: { id: true, title: true, imageUrl: true },
      })
   ).filter((g) => isDataUri(g.imageUrl));

   if (products.length === 0 && galleries.length === 0) {
      console.log("Tidak ada gambar base64 di DB — tidak ada yang perlu dimigrasi.");
      return;
   }

   console.log(`Akan migrasi: ${products.length} product, ${galleries.length} gallery`);

   // ===== 2. Backup nilai lama SEBELUM mengubah apa pun =====
   const backupPath = path.join(
      __dirname,
      `backup-base64-images-${Date.now()}.json`
   );
   fs.writeFileSync(backupPath, JSON.stringify({ products, galleries }, null, 2));
   console.log(`Backup nilai lama disimpan di: ${backupPath}`);

   // ===== 3. Upload ke Cloudinary & update DB =====
   // cache per data URI supaya cover yang sama dengan images[0]
   // tidak ter-upload dua kali
   const uploadedCache = new Map();
   const toCloudinaryUrl = async (uri, folder) => {
      if (!isDataUri(uri)) return uri; // sudah URL — biarkan
      if (!uploadedCache.has(uri)) {
         const result = await uploadImageBuffer(dataUriToBuffer(uri), folder);
         uploadedCache.set(uri, result.secure_url);
      }
      return uploadedCache.get(uri);
   };

   for (const p of products) {
      const newImages = [];
      for (const img of p.images ?? []) {
         newImages.push(await toCloudinaryUrl(img, "talita-cakes/products"));
      }
      const newImage = await toCloudinaryUrl(p.image, "talita-cakes/products");

      await prisma.product.update({
         where: { id: p.id },
         data: { image: newImage, images: newImages },
      });
      console.log(`✔ product  "${p.name}" (${p.id})`);
   }

   for (const g of galleries) {
      const newUrl = await toCloudinaryUrl(g.imageUrl, "talita-cakes/gallery");
      await prisma.gallery.update({
         where: { id: g.id },
         data: { imageUrl: newUrl },
      });
      console.log(`✔ gallery  "${g.title}" (${g.id})`);
   }

   console.log("Migrasi selesai.");
};

main()
   .catch((err) => {
      console.error("Migrasi gagal:", err);
      process.exitCode = 1;
   })
   .finally(() => prisma.$disconnect());
