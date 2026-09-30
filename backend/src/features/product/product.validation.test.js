import { describe, it, expect } from "vitest";
import {
   createProductSchema,
   updateProductSchemaMap,
   productIdParamSchema,
} from "./product.validation.js";

// Contoh data diambil dari produk yang benar-benar dijual.

const IMG = "https://res.cloudinary.com/talita/image/upload/v1/produk-1.jpg";
const IMG2 = "https://res.cloudinary.com/talita/image/upload/v1/produk-2.jpg";

const base = {
   name: "Produk Contoh",
   description: "Deskripsi produk",
   descriptionEn: "Product description",
   images: [IMG],
};

const variantsOf = (shape, priceBySize) =>
   Object.entries(priceBySize).map(([size, price]) => ({
      shape,
      size: Number(size),
      price,
   }));

// Double Choco Custard Cake: bulat 16-30, kotak 20-30.
const DOUBLE_CHOCO_VARIANTS = [
   ...variantsOf("ROUND", {
      16: 135000,
      18: 150000,
      20: 200000,
      22: 285000,
      24: 400000,
      26: 500000,
      28: 600000,
      30: 700000,
   }),
   ...variantsOf("SQUARE", {
      20: 250000,
      22: 350000,
      24: 450000,
      26: 550000,
      28: 650000,
      30: 750000,
   }),
];

// Kuromi Theme Exclusive Figurine Cake: bulat 18-30, kotak 20-30.
const KUROMI_VARIANTS = [
   ...variantsOf("ROUND", {
      18: 375000,
      20: 425000,
      22: 485000,
      24: 585000,
      26: 685000,
      28: 785000,
      30: 885000,
   }),
   ...variantsOf("SQUARE", {
      20: 450000,
      22: 550000,
      24: 650000,
      26: 750000,
      28: 850000,
      30: 950000,
   }),
];

const VALID = {
   TYPE1: {
      ...base,
      type: "TYPE1",
      name: "Choco Cream Shortcake Series",
      category: "Signature Shortcake Series",
      flavor: "Choco Cream",
      shape: "ROUND",
      size: 14,
      price: 100000,
   },
   TYPE2: {
      ...base,
      type: "TYPE2",
      name: "Potrait Theme Paper Topper Petite Cake",
      category: "Paper Topper Petite Cake",
      shape: "ROUND",
      size: 10,
      price: 75000,
   },
   TYPE3: {
      ...base,
      type: "TYPE3",
      name: "Double Choco Custard Cake",
      category: "Signature Original Cake Series",
      flavor: "Double Choco",
      variants: DOUBLE_CHOCO_VARIANTS,
   },
   TYPE4: {
      ...base,
      type: "TYPE4",
      name: "Kuromi Theme Exclusive Figurine Cake",
      category: "Custom Exclusive Figurine Cake",
      variants: KUROMI_VARIANTS,
   },
   TYPE5_BROWNIES: {
      ...base,
      type: "TYPE5",
      name: "Cadbury Premium Fudge Brownies",
      category: "Brownies",
      subcategory: "SIGNATURE PREMIUM FUDGE BROWNIES",
      flavor: "Cadbury",
      shape: "SQUARE",
      size: 22,
      sizeB: 10,
      price: 75000,
   },
   TYPE5_BASQUE: {
      ...base,
      type: "TYPE5",
      name: "Basque Burnt Cheese Cake",
      category: "Cheese Cake",
      subcategory: "BASQUE BURNT CHEESE CAKE",
      flavor: "Original",
      variants: [
         { size: 14, price: 150000 },
         { size: 18, price: 250000 },
      ],
   },
   TYPE5_CINROLLS: {
      ...base,
      type: "TYPE5",
      name: "Cinnamon Rolls With Cream Cheese Frosting",
      category: "Bread",
      subcategory: "CINROLLS VAN DEPOK",
      flavor: "Cinnamon",
      breadSizes: [
         { key: "PERSONAL", price: 75000 },
         { key: "FAMILY", price: 115000 },
         { key: "SHARING", price: 115000 },
      ],
      filling: {
         options: [
            { name: "No Filling" },
            { name: "Kismis / Raisin" },
            { name: "Choco Chips" },
         ],
         defaultIndex: 1,
      },
      topping: {
         options: [{ name: "Cream Cheese" }, { name: "Almond" }],
         maxSelect: 2,
      },
      comboPrices: [{ filling: "Choco Chips", topping: "Almond", price: 5000 }],
   },
   TYPE6_AMERICAN: {
      ...base,
      type: "TYPE6",
      name: "Nutella Cupcakes",
      category: "American Butter Cupcakes",
      flavor: "Nutella",
      variants: [
         { size: 4, price: 100000 },
         { size: 6, price: 150000 },
         { size: 9, price: 225000 },
         { size: 12, price: 300000 },
      ],
   },
   TYPE6_SIMPLE: {
      ...base,
      type: "TYPE6",
      name: "Simple Decor Cupcakes",
      category: "Simple Decor Cupcakes",
      variants: [{ size: 4, price: 100000 }],
   },
   TYPE6_GOODIEBAG: {
      ...base,
      type: "TYPE6",
      name: "Kuromi Paper Topper Goodiebag Cupcakes",
      category: "Goodiebag Cupcakes",
      subcategory: "Custom Goodiebag",
      variants: [{ price: 28000 }],
   },
};

const parse = (data) => createProductSchema.safeParse(data);
const messagesOf = (result) => result.error.issues.map((i) => i.message);

describe("productIdParamSchema", () => {
   it("menerima UUID", () => {
      expect(
         productIdParamSchema.safeParse({
            id: "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b",
         }).success
      ).toBe(true);
   });

   it("menolak id yang bukan UUID", () => {
      const result = productIdParamSchema.safeParse({ id: "123" });
      expect(result.success).toBe(false);
      expect(messagesOf(result)).toContain("Format id tidak valid");
   });
});

describe("createProductSchema: data sah", () => {
   it.each(Object.entries(VALID))("menerima %s", (_, data) => {
      const result = parse(data);
      expect(result.error?.issues).toBeUndefined();
      expect(result.success).toBe(true);
   });

   it("mengisi diskon 0 kalau tidak dikirim", () => {
      expect(parse(VALID.TYPE1).data.discount).toBe(0);
   });

   it("mengubah angka berbentuk teks dari form menjadi angka", () => {
      const result = parse({
         ...VALID.TYPE1,
         size: "14",
         price: "100000",
         discount: "10",
      });
      expect(result.data).toMatchObject({
         size: 14,
         price: 100000,
         discount: 10,
      });
   });

   it("merapikan spasi di awal dan akhir teks", () => {
      expect(parse({ ...VALID.TYPE1, name: "  Choco  " }).data.name).toBe(
         "Choco"
      );
   });

   it("mengisi defaultIndex filling dan maxSelect topping kalau tidak dikirim", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         filling: { options: [{ name: "No Filling" }] },
         topping: { options: [{ name: "Almond" }] },
         comboPrices: [],
      });
      expect(result.data.filling.defaultIndex).toBe(0);
      expect(result.data.topping.maxSelect).toBe(1);
   });
});

describe("createProductSchema: field dasar", () => {
   it("menolak tipe yang tidak dikenal", () => {
      expect(parse({ ...VALID.TYPE1, type: "TYPE7" }).success).toBe(false);
   });

   it("menolak data tanpa tipe", () => {
      const { type, ...noType } = VALID.TYPE1;
      expect(parse(noType).success).toBe(false);
   });

   it("menolak harga negatif", () => {
      const result = parse({ ...VALID.TYPE1, price: -100000 });
      expect(messagesOf(result)).toContain("Price harus lebih dari 0");
   });

   it("menolak harga 0", () => {
      expect(parse({ ...VALID.TYPE2, price: 0 }).success).toBe(false);
   });

   it("menolak diskon di luar 0 sampai 100", () => {
      expect(parse({ ...VALID.TYPE1, discount: -1 }).success).toBe(false);
      expect(parse({ ...VALID.TYPE1, discount: 101 }).success).toBe(false);
   });

   it("menolak kategori yang tidak ada di product.constant.js", () => {
      const result = parse({ ...VALID.TYPE1, category: "Kue Ulang Tahun" });
      expect(messagesOf(result)).toContain("Category tidak valid untuk TYPE1");
   });

   it("menolak kategori milik tipe lain", () => {
      const result = parse({
         ...VALID.TYPE1,
         category: "Signature Original Cake Series",
      });
      expect(messagesOf(result)).toContain("Category tidak valid untuk TYPE1");
   });

   it("menolak produk tanpa gambar", () => {
      const result = parse({ ...VALID.TYPE1, images: [] });
      expect(messagesOf(result)).toContain("Minimal 1 gambar wajib diunggah");
   });

   it("menolak nama yang hanya berisi spasi", () => {
      const result = parse({ ...VALID.TYPE1, name: "   " });
      expect(messagesOf(result)).toContain("Nama wajib diisi");
   });

   it("menolak deskripsi bahasa Inggris yang kosong", () => {
      const result = parse({ ...VALID.TYPE1, descriptionEn: "" });
      expect(messagesOf(result)).toContain("Deskripsi (English) wajib diisi");
   });
});

describe("createProductSchema: TYPE1 & TYPE2", () => {
   it("TYPE1 wajib punya rasa", () => {
      const { flavor, ...noFlavor } = VALID.TYPE1;
      expect(parse(noFlavor).success).toBe(false);
   });

   it("menolak ukuran desimal", () => {
      expect(parse({ ...VALID.TYPE1, size: 14.5 }).success).toBe(false);
   });

   it("menolak ukuran 0", () => {
      const result = parse({ ...VALID.TYPE2, size: 0 });
      expect(messagesOf(result)).toContain(
         "Size harus berupa angka bulat positif"
      );
   });

   it("menolak bentuk selain ROUND dan SQUARE", () => {
      expect(parse({ ...VALID.TYPE2, shape: "HEART" }).success).toBe(false);
   });
});

describe("createProductSchema: TYPE3 & TYPE4", () => {
   it("menolak produk yang hanya punya bentuk bulat", () => {
      const result = parse({
         ...VALID.TYPE3,
         variants: DOUBLE_CHOCO_VARIANTS.filter((v) => v.shape === "ROUND"),
      });
      expect(messagesOf(result)).toContain(
         "Wajib mengisi minimal satu size Round dan satu size Square"
      );
   });

   it("menolak ukuran yang tidak lengkap sampai 30", () => {
      const result = parse({
         ...VALID.TYPE3,
         variants: DOUBLE_CHOCO_VARIANTS.filter(
            (v) => !(v.shape === "ROUND" && v.size === 24)
         ),
      });
      expect(messagesOf(result)).toContain(
         "ROUND wajib diisi lengkap dari 16cm sampai 30cm (kelipatan 2): 16, 18, 20, 22, 24, 26, 28, 30"
      );
   });

   it("menolak kombinasi bentuk+ukuran ganda", () => {
      const result = parse({
         ...VALID.TYPE4,
         variants: [...KUROMI_VARIANTS, KUROMI_VARIANTS[0]],
      });
      expect(messagesOf(result)).toContain(
         "Terdapat duplikat shape+size pada variants"
      );
   });

   it("menolak ukuran ganjil", () => {
      const result = parse({
         ...VALID.TYPE4,
         variants: [...KUROMI_VARIANTS, { shape: "ROUND", size: 19, price: 1 }],
      });
      expect(messagesOf(result)).toContain(
         "Size tidak valid untuk shape tersebut"
      );
   });

   it("menolak kotak mulai 16", () => {
      const result = parse({
         ...VALID.TYPE4,
         variants: [
            ...KUROMI_VARIANTS,
            { shape: "SQUARE", size: 16, price: 300000 },
         ],
      });
      expect(result.success).toBe(false);
   });

   it("menolak harga varian 0", () => {
      const variants = KUROMI_VARIANTS.map((v, i) =>
         i === 0 ? { ...v, price: 0 } : v
      );
      expect(parse({ ...VALID.TYPE4, variants }).success).toBe(false);
   });

   it("menerima foto varian yang ada di galeri produk", () => {
      const variants = DOUBLE_CHOCO_VARIANTS.map((v) => ({
         ...v,
         image: v.shape === "ROUND" ? IMG : IMG2,
      }));
      expect(
         parse({ ...VALID.TYPE3, images: [IMG, IMG2], variants }).success
      ).toBe(true);
   });

   it("menolak foto varian yang tidak ada di galeri produk", () => {
      const variants = DOUBLE_CHOCO_VARIANTS.map((v) => ({
         ...v,
         image: IMG2,
      }));
      const result = parse({ ...VALID.TYPE3, variants });
      expect(messagesOf(result)).toContain(
         "Foto varian harus salah satu foto produk yang diunggah"
      );
   });
});

describe("createProductSchema: TYPE5", () => {
   it("menolak sub-kategori milik kategori lain", () => {
      const result = parse({
         ...VALID.TYPE5_BROWNIES,
         subcategory: "BASQUE BURNT CHEESE CAKE",
      });
      expect(messagesOf(result)).toContain(
         "Subcategory tidak valid untuk kategori Brownies"
      );
   });

   it("menolak produk tanpa sub-kategori", () => {
      const { subcategory, ...noSub } = VALID.TYPE5_BROWNIES;
      expect(messagesOf(parse(noSub))).toContain("Subcategory wajib diisi");
   });

   it("kotak wajib punya dua ukuran", () => {
      const { sizeB, ...noSizeB } = VALID.TYPE5_BROWNIES;
      expect(messagesOf(parse(noSizeB))).toContain(
         "Untuk Square, isi kedua ukuran (mis. 20 x 10)"
      );
   });

   it("bulat hanya boleh satu ukuran", () => {
      const result = parse({ ...VALID.TYPE5_BROWNIES, shape: "ROUND" });
      expect(messagesOf(result)).toContain("Round hanya memakai satu ukuran");
   });

   it("produk ukuran tunggal wajib punya bentuk, ukuran, dan harga", () => {
      const { shape, size, price, sizeB, ...rest } = VALID.TYPE5_BROWNIES;
      const messages = messagesOf(parse(rest));
      expect(messages).toContain("Shape wajib diisi");
      expect(messages).toContain("Size wajib diisi");
      expect(messages).toContain("Price harus lebih dari 0");
   });

   it("Basque menolak ukuran di luar 14, 16, 18, 20", () => {
      const result = parse({
         ...VALID.TYPE5_BASQUE,
         variants: [{ size: 22, price: 300000 }],
      });
      expect(messagesOf(result)).toContain(
         "Ukuran tidak valid untuk BASQUE BURNT CHEESE CAKE. Pilihan: 14, 16, 18, 20"
      );
   });

   it("Basque menolak ukuran ganda", () => {
      const result = parse({
         ...VALID.TYPE5_BASQUE,
         variants: [
            { size: 14, price: 150000 },
            { size: 14, price: 160000 },
         ],
      });
      expect(messagesOf(result)).toContain("Terdapat ukuran duplikat");
   });

   it("Basque wajib punya minimal satu harga ukuran", () => {
      const result = parse({ ...VALID.TYPE5_BASQUE, variants: [] });
      expect(messagesOf(result)).toContain("Isi harga minimal satu ukuran");
   });

   it("Bread wajib punya minimal satu harga ukuran", () => {
      const result = parse({ ...VALID.TYPE5_CINROLLS, breadSizes: [] });
      expect(messagesOf(result)).toContain("Isi harga minimal satu ukuran");
   });

   it("Bread menolak ukuran bernama ganda", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         breadSizes: [
            { key: "PERSONAL", price: 75000 },
            { key: "PERSONAL", price: 80000 },
         ],
      });
      expect(messagesOf(result)).toContain("Terdapat ukuran duplikat");
   });

   it("Bread menolak ukuran bernama yang tidak dikenal", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         breadSizes: [{ key: "JUMBO", price: 75000 }],
      });
      expect(messagesOf(result)).toContain("Ukuran bread tidak valid");
   });

   it("menolak filling untuk sub-kategori selain Cinrolls", () => {
      const result = parse({
         ...VALID.TYPE5_BROWNIES,
         filling: VALID.TYPE5_CINROLLS.filling,
      });
      expect(messagesOf(result)).toContain(
         "Filling hanya tersedia untuk CINROLLS VAN DEPOK"
      );
   });

   it("menolak topping untuk sub-kategori selain Cinrolls", () => {
      const result = parse({
         ...VALID.TYPE5_BROWNIES,
         topping: VALID.TYPE5_CINROLLS.topping,
      });
      expect(messagesOf(result)).toContain(
         "Topping hanya tersedia untuk CINROLLS VAN DEPOK"
      );
   });

   it("menolak nama filling kembar walau beda huruf besar-kecil", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         filling: {
            options: [{ name: "Choco Chips" }, { name: "choco chips" }],
         },
         comboPrices: null,
      });
      expect(messagesOf(result)).toContain(
         "Nama pilihan filling tidak boleh sama"
      );
   });

   it("menolak filling default di luar daftar", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         filling: { ...VALID.TYPE5_CINROLLS.filling, defaultIndex: 3 },
      });
      expect(messagesOf(result)).toContain(
         "Pilihan filling default tidak valid"
      );
   });

   it("menolak lebih dari 6 pilihan filling", () => {
      const options = Array.from({ length: 7 }, (_, i) => ({
         name: `Filling ${i}`,
      }));
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         filling: { options },
         comboPrices: null,
      });
      expect(messagesOf(result)).toContain("Maksimal 6 pilihan filling");
   });

   it("menolak batas pilihan topping lebih dari 3", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         topping: {
            options: [
               { name: "A" },
               { name: "B" },
               { name: "C" },
               { name: "D" },
            ],
            maxSelect: 4,
         },
         comboPrices: null,
      });
      expect(result.success).toBe(false);
   });

   it("menolak batas pilihan topping melebihi jumlah opsi", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         topping: { options: [{ name: "Almond" }], maxSelect: 2 },
         comboPrices: null,
      });
      expect(messagesOf(result)).toContain(
         "Batas jumlah pilihan melebihi jumlah opsi topping"
      );
   });

   it("menolak harga kombinasi negatif", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         comboPrices: [
            { filling: "Choco Chips", topping: "Almond", price: -1 },
         ],
      });
      expect(messagesOf(result)).toContain(
         "Harga kombinasi tidak boleh negatif"
      );
   });

   it("menolak pasangan kombinasi ganda", () => {
      const combo = { filling: "Choco Chips", topping: "Almond", price: 5000 };
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         comboPrices: [combo, combo],
      });
      expect(messagesOf(result)).toContain(
         "Kombinasi ganda: Choco Chips + Almond"
      );
   });

   it("menolak kombinasi yang menunjuk filling atau topping yang tidak ada", () => {
      const result = parse({
         ...VALID.TYPE5_CINROLLS,
         comboPrices: [{ filling: "Keju", topping: "Meses", price: 5000 }],
      });
      const messages = messagesOf(result);
      expect(messages).toContain("Filling kombinasi tidak dikenal: Keju");
      expect(messages).toContain("Topping kombinasi tidak dikenal: Meses");
   });

   it("menolak harga kombinasi untuk sub-kategori selain Cinrolls", () => {
      const result = parse({
         ...VALID.TYPE5_BROWNIES,
         comboPrices: VALID.TYPE5_CINROLLS.comboPrices,
      });
      expect(messagesOf(result)).toContain(
         "Harga kombinasi hanya tersedia untuk CINROLLS VAN DEPOK"
      );
   });
});

describe("createProductSchema: TYPE6", () => {
   it("American Butter wajib punya rasa", () => {
      const { flavor, ...noFlavor } = VALID.TYPE6_AMERICAN;
      expect(messagesOf(parse(noFlavor))).toContain(
         "Flavor wajib diisi untuk American Butter Cupcakes"
      );
   });

   it("menolak isi box yang bukan pilihan kategorinya", () => {
      // Paper Topper hanya menyediakan box 6, 9, 12.
      const result = parse({
         ...VALID.TYPE6_SIMPLE,
         category: "Paper Topper Cupcakes",
         variants: [{ size: 4, price: 100000 }],
      });
      expect(messagesOf(result)).toContain(
         "Isi box tidak valid untuk Paper Topper Cupcakes. Pilihan: 6, 9, 12"
      );
   });

   it("menolak isi box ganda", () => {
      const result = parse({
         ...VALID.TYPE6_SIMPLE,
         variants: [
            { size: 4, price: 100000 },
            { size: 4, price: 90000 },
         ],
      });
      expect(messagesOf(result)).toContain("Terdapat isi box duplikat");
   });

   it("cupcake biasa wajib mengisi isi box", () => {
      const result = parse({
         ...VALID.TYPE6_SIMPLE,
         variants: [{ price: 100000 }],
      });
      expect(messagesOf(result)).toContain(
         "Isi box wajib diisi untuk Simple Decor Cupcakes"
      );
   });

   it("menolak sub-kategori untuk cupcake selain goodiebag", () => {
      const result = parse({
         ...VALID.TYPE6_SIMPLE,
         subcategory: "Custom Goodiebag",
      });
      expect(messagesOf(result)).toContain(
         "Kategori Simple Decor Cupcakes tidak memiliki subcategory"
      );
   });

   it("goodiebag hanya boleh punya satu harga", () => {
      const result = parse({
         ...VALID.TYPE6_GOODIEBAG,
         variants: [{ price: 28000 }, { price: 30000 }],
      });
      expect(messagesOf(result)).toContain(
         "Goodiebag Cupcakes hanya boleh punya satu harga box"
      );
   });

   it("goodiebag wajib punya sub-kategori", () => {
      const { subcategory, ...noSub } = VALID.TYPE6_GOODIEBAG;
      expect(messagesOf(parse(noSub))).toContain(
         "Subcategory wajib diisi untuk Goodiebag Cupcakes"
      );
   });

   it("goodiebag menolak sub-kategori yang tidak dikenal", () => {
      const result = parse({
         ...VALID.TYPE6_GOODIEBAG,
         subcategory: "Premium Goodiebag",
      });
      expect(messagesOf(result)).toContain(
         "Subcategory tidak valid. Pilihan: Original Goodiebag, Custom Goodiebag"
      );
   });

   it("menolak produk tanpa varian", () => {
      const result = parse({ ...VALID.TYPE6_AMERICAN, variants: [] });
      expect(messagesOf(result)).toContain(
         "Minimal satu pilihan isi box wajib diisi"
      );
   });
});

describe("updateProductSchemaMap", () => {
   it("punya skema untuk keenam tipe", () => {
      expect(Object.keys(updateProductSchemaMap)).toEqual([
         "TYPE1",
         "TYPE2",
         "TYPE3",
         "TYPE4",
         "TYPE5",
         "TYPE6",
      ]);
   });

   it("menerima perubahan harga saja", () => {
      const result = updateProductSchemaMap.TYPE1.safeParse({ price: 60000 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ price: 60000 });
   });

   // Kalau diskon diberi nilai bawaan saat update, mengubah nama saja akan
   // diam-diam menghapus diskon yang sedang berjalan.
   it("tidak mengisi diskon kalau tidak dikirim", () => {
      const result = updateProductSchemaMap.TYPE3.safeParse({ name: "Baru" });
      expect(result.data).not.toHaveProperty("discount");
   });

   it("menerima data kosong", () => {
      for (const schema of Object.values(updateProductSchemaMap)) {
         expect(schema.safeParse({}).success).toBe(true);
      }
   });

   it("tetap menolak harga negatif", () => {
      expect(
         updateProductSchemaMap.TYPE2.safeParse({ price: -1 }).success
      ).toBe(false);
   });

   it("tetap menolak kategori milik tipe lain", () => {
      expect(
         updateProductSchemaMap.TYPE4.safeParse({
            category: "Signature Shortcake Series",
         }).success
      ).toBe(false);
   });

   it("TYPE3 menerima sebagian ukuran saja", () => {
      expect(
         updateProductSchemaMap.TYPE3.safeParse({
            variants: [{ shape: "ROUND", size: 20, price: 210000 }],
         }).success
      ).toBe(true);
   });

   it("TYPE5 menolak variants untuk sub-kategori tanpa pilihan ukuran", () => {
      const result = updateProductSchemaMap.TYPE5.safeParse({
         subcategory: "SIGNATURE PREMIUM FUDGE BROWNIES",
         variants: [{ size: 14, price: 150000 }],
      });
      expect(messagesOf(result)).toContain(
         "variants hanya untuk sub-kategori dengan pilihan ukuran"
      );
   });

   it("TYPE5 menolak sub-kategori yang tidak cocok dengan kategori", () => {
      const result = updateProductSchemaMap.TYPE5.safeParse({
         category: "Brownies",
         subcategory: "CINROLLS VAN DEPOK",
      });
      expect(messagesOf(result)).toContain("Subcategory tidak valid");
   });

   it("TYPE5 menerima sub-kategori sah tanpa kategori", () => {
      expect(
         updateProductSchemaMap.TYPE5.safeParse({
            subcategory: "CINROLLS VAN DEPOK",
         }).success
      ).toBe(true);
   });

   it("TYPE5 menerima null untuk mengosongkan filling", () => {
      expect(
         updateProductSchemaMap.TYPE5.safeParse({ filling: null }).success
      ).toBe(true);
   });

   it("TYPE6 mewajibkan kategori saat mengirim varian", () => {
      const result = updateProductSchemaMap.TYPE6.safeParse({
         variants: [{ size: 4, price: 100000 }],
      });
      expect(messagesOf(result)).toContain(
         "Category wajib dikirim bersama variants"
      );
   });

   it("TYPE6 mewajibkan kategori saat mengirim sub-kategori", () => {
      const result = updateProductSchemaMap.TYPE6.safeParse({
         subcategory: "Custom Goodiebag",
      });
      expect(messagesOf(result)).toContain(
         "Category wajib dikirim bersama subcategory"
      );
   });

   it("TYPE6 memeriksa isi box terhadap kategori yang dikirim", () => {
      const result = updateProductSchemaMap.TYPE6.safeParse({
         category: "American Butter Cupcakes",
         variants: [{ size: 5, price: 100000 }],
      });
      expect(messagesOf(result)).toContain(
         "Isi box tidak valid untuk American Butter Cupcakes. Pilihan: 2, 4, 6, 9, 12"
      );
   });
});
