// backend/prisma/seedSample.js
//
// Script TAMBAHAN (di luar seed.js admin) untuk mengisi data dummy:
// - 2 User (role USER)
// - 4 Product: 1x TYPE1, 1x TYPE2, 1x TYPE3, 1x TYPE4 (lengkap dengan variants)
//
// Cara pakai:
//   node prisma/seedSample.js
//
// Catatan:
// - TYPE1 & TYPE2 cuma punya 1 variant manual (shape, size, price), size-nya
//   bebas asal integer > 0 (isValidManualSize), TIDAK mengikuti aturan kelipatan 2.
// - TYPE3 & TYPE4: variant ROUND & SQUARE dibuat LENGKAP dari minSize sampai 30
//   (kelipatan 2), sesuai aturan di product.helper.js (validateSizeCompleteness),
//   supaya tidak kena error validasi kalau nanti di-update lewat endpoint.
// - TYPE2 & TYPE4 tidak punya flavor fixed (flavor di-set null),
//   user memilih flavor sendiri saat order.

import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

async function main() {
  // =========================
  // 1. SEED 2 USER
  // =========================
  const usersData = [
    {
      name: "Galih",
      email: "galih@email.com",
      password: "galih123",
      phone: "081234567890",
      role: "USER",
    },
    {
      name: "Siti Aminah",
      email: "siti.aminah@example.com",
      password: "Siti123!",
      phone: "081298765432",
      role: "USER",
    },
  ];

  const createdUsers = [];

  for (const u of usersData) {
    const hashedPassword = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        phone: u.phone,
        role: u.role,
      },
    });

    createdUsers.push(user);
    console.log(`User berhasil dibuat/ditemukan: ${user.email}`);
  }

  // =========================
  // 2. SEED PRODUCT TYPE1
  // (single variant manual, semua fixed: shape, size, flavor)
  // =========================
  const productType1 = await prisma.product.create({
    data: {
      type: "TYPE1",
      name: "Brownies Coklat Mini",
      description: "Brownies coklat lembut ukuran mini, cocok untuk snack box.",
      image: "https://example.com/images/brownies-coklat-mini.jpg",
      images: ["https://example.com/images/brownies-coklat-mini.jpg"],
      category: "Hampers",
      flavor: "Coklat",
      discount: 0,
      variants: {
        create: [{ shape: "ROUND", size: 12, price: 35000 }],
      },
    },
    include: { variants: true },
  });

  console.log("Product TYPE1 berhasil dibuat:", productType1.name);

  // =========================
  // 3. SEED PRODUCT TYPE2
  // (single variant manual fixed, user pilih flavor + dekorasi saat order)
  // =========================
  const productType2 = await prisma.product.create({
    data: {
      type: "TYPE2",
      name: "Kue Ulang Tahun Mini Custom",
      description:
        "Kue ukuran fixed dengan pilihan rasa dan dekorasi sesuai keinginanmu.",
      image: "https://example.com/images/kue-ultah-mini-custom.jpg",
      images: ["https://example.com/images/kue-ultah-mini-custom.jpg"],
      category: "Birthday",
      flavor: null, // user pilih flavor sendiri saat order
      discount: 0,
      variants: {
        create: [{ shape: "ROUND", size: 16, price: 85000 }],
      },
    },
    include: { variants: true },
  });

  console.log("Product TYPE2 berhasil dibuat:", productType2.name);

  // =========================
  // 4. SEED PRODUCT TYPE3
  // (flavor fixed, variants lengkap ROUND 16-30 & SQUARE 18-30)
  // =========================
  const round16to30 = [16, 18, 20, 22, 24, 26, 28, 30].map((size) => ({
    shape: "ROUND",
    size,
    price: 50000 + (size - 16) * 7500, // harga naik sesuai ukuran
  }));

  const square18to30 = [18, 20, 22, 24, 26, 28, 30].map((size) => ({
    shape: "SQUARE",
    size,
    price: 60000 + (size - 18) * 7500,
  }));

  const productType3 = await prisma.product.create({
    data: {
      type: "TYPE3",
      name: "Tart Buah Premium",
      description: "Tart lembut dengan topping buah segar, tersedia berbagai ukuran.",
      image: "https://example.com/images/tart-buah-premium.jpg",
      images: ["https://example.com/images/tart-buah-premium.jpg"],
      category: "Wedding",
      flavor: "Vanilla",
      discount: 10,
      variants: {
        create: [...round16to30, ...square18to30],
      },
    },
    include: { variants: true },
  });

  console.log("Product TYPE3 berhasil dibuat:", productType3.name);

  // =========================
  // 5. SEED PRODUCT TYPE4
  // (tanpa flavor fixed, user pilih flavor + dekorasi,
  //  variants lengkap ROUND 18-30 & SQUARE 20-30)
  // =========================
  const round18to30 = [18, 20, 22, 24, 26, 28, 30].map((size) => ({
    shape: "ROUND",
    size,
    price: 70000 + (size - 18) * 8000,
  }));

  const square20to30 = [20, 22, 24, 26, 28, 30].map((size) => ({
    shape: "SQUARE",
    size,
    price: 80000 + (size - 20) * 8000,
  }));

  const productType4 = await prisma.product.create({
    data: {
      type: "TYPE4",
      name: "Custom Cake Spesial",
      description:
        "Kue fully custom: pilih ukuran, rasa, dan kirim referensi dekorasimu.",
      image: "https://example.com/images/custom-cake-spesial.jpg",
      images: ["https://example.com/images/custom-cake-spesial.jpg"],
      category: "Custom",
      flavor: null, // user pilih flavor sendiri saat order
      discount: 5,
      variants: {
        create: [...round18to30, ...square20to30],
      },
    },
    include: { variants: true },
  });

  console.log("Product TYPE4 berhasil dibuat:", productType4.name);

  console.log("\n=== Seeding selesai ===");
  console.log(`Total user dibuat/ditemukan: ${createdUsers.length}`);
  console.log("Produk: TYPE1, TYPE2, TYPE3, TYPE4 berhasil dibuat.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
