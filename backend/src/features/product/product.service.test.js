import { describe, it, expect, beforeEach, vi } from "vitest";
import {
   createProduct,
   getProductById,
   getAllProducts,
   getProductCount,
   searchProducts,
   updateProduct,
   removeProduct,
} from "./product.service.js";
import * as productRepository from "./product.repository.js";
import { triggerRebuild } from "../../utils/deployHook.js";
import { cacheDeleteByPrefix } from "../../lib/cache.js";

vi.mock("./product.repository.js");
// Build ulang situs memanggil layanan hosting; di test cukup dicatat.
vi.mock("../../utils/deployHook.js");

const IMG = "https://res.cloudinary.com/talita/image/upload/v1/produk-1.jpg";
const IMG2 = "https://res.cloudinary.com/talita/image/upload/v1/produk-2.jpg";

const base = {
   name: "Produk Contoh",
   description: "Deskripsi",
   descriptionEn: "Description",
   images: [IMG, IMG2],
   discount: 0,
};

beforeEach(() => {
   vi.resetAllMocks();
   // Cache asli dipakai supaya pembersihannya ikut teruji. Isinya bertahan
   // antar test, jadi dikosongkan dulu.
   cacheDeleteByPrefix("");
   productRepository.createProductWithVariants.mockImplementation(
      async (data) => data
   );
});

// Data yang diserahkan ke repository saat membuat produk.
const created = () =>
   productRepository.createProductWithVariants.mock.calls[0][0];

// =========================
// CREATE
// =========================

describe("createProduct: data umum", () => {
   it("cover diambil dari foto pertama", async () => {
      await createProduct({
         ...base,
         type: "TYPE2",
         category: "Paper Topper Petite Cake",
         shape: "ROUND",
         size: 10,
         price: 75000,
      });
      expect(created()).toMatchObject({ image: IMG, images: [IMG, IMG2] });
   });

   it("membersihkan cache produk dan memicu build ulang situs", async () => {
      productRepository.findAllProducts.mockResolvedValue([]);
      await getAllProducts();

      await createProduct({
         ...base,
         type: "TYPE2",
         category: "Paper Topper Petite Cake",
         shape: "ROUND",
         size: 10,
         price: 75000,
      });
      await getAllProducts();

      expect(productRepository.findAllProducts).toHaveBeenCalledTimes(2);
      expect(triggerRebuild).toHaveBeenCalledWith("product changed");
   });
});

describe("createProduct: TYPE1 & TYPE2", () => {
   it("TYPE1: satu varian dari data utama, rasa disimpan", async () => {
      // Choco Cream Shortcake Series
      await createProduct({
         ...base,
         type: "TYPE1",
         category: "Signature Shortcake Series",
         flavor: "Choco Cream",
         shape: "ROUND",
         size: 14,
         price: 100000,
      });
      expect(created()).toMatchObject({
         flavor: "Choco Cream",
         subcategory: null,
         filling: null,
         topping: null,
         comboPrices: null,
         variants: { create: [{ shape: "ROUND", size: 14, price: 100000 }] },
      });
   });

   it("TYPE2: rasa tidak disimpan karena dipilih pembeli", async () => {
      await createProduct({
         ...base,
         type: "TYPE2",
         category: "Paper Topper Petite Cake",
         flavor: "Double Choco",
         shape: "ROUND",
         size: 10,
         price: 75000,
      });
      expect(created().flavor).toBeNull();
   });

   it("sub-kategori yang dikirim untuk TYPE1 tidak disimpan", async () => {
      await createProduct({
         ...base,
         type: "TYPE1",
         category: "Signature Shortcake Series",
         subcategory: "CINROLLS VAN DEPOK",
         flavor: "Choco Cream",
         shape: "ROUND",
         size: 14,
         price: 100000,
      });
      expect(created().subcategory).toBeNull();
   });
});

describe("createProduct: TYPE3 & TYPE4", () => {
   const variants = [
      { shape: "ROUND", size: 16, price: 135000, image: IMG },
      { shape: "SQUARE", size: 20, price: 250000 },
   ];

   it("TYPE3: semua varian disimpan, foto varian kosong jadi null", async () => {
      await createProduct({
         ...base,
         type: "TYPE3",
         category: "Signature Original Cake Series",
         flavor: "Double Choco",
         variants,
      });
      expect(created()).toMatchObject({
         flavor: "Double Choco",
         variants: {
            create: [
               { shape: "ROUND", size: 16, price: 135000, image: IMG },
               { shape: "SQUARE", size: 20, price: 250000, image: null },
            ],
         },
      });
   });

   it("TYPE4: rasa tidak disimpan karena dipilih pembeli", async () => {
      await createProduct({
         ...base,
         type: "TYPE4",
         category: "Custom Exclusive Figurine Cake",
         flavor: "Blackforest",
         variants,
      });
      expect(created().flavor).toBeNull();
   });
});

describe("createProduct: TYPE5", () => {
   it("Bread: ukuran bernama diubah menjadi dimensi tetap", async () => {
      await createProduct({
         ...base,
         type: "TYPE5",
         category: "Bread",
         subcategory: "CINROLLS VAN DEPOK",
         flavor: "Cinnamon",
         breadSizes: [
            { key: "PERSONAL", price: 75000, image: IMG2 },
            { key: "FAMILY", price: 115000 },
            { key: "SHARING", price: 115000 },
         ],
      });
      expect(created().variants.create).toEqual([
         { shape: "SQUARE", size: 22, sizeB: 10, price: 75000, image: IMG2 },
         { shape: "ROUND", size: 25, sizeB: null, price: 115000, image: null },
         { shape: null, size: 9, sizeB: null, price: 115000, image: null },
      ]);
   });

   it("Cinrolls menyimpan filling, topping, dan harga kombinasi", async () => {
      const filling = { options: [{ name: "Choco Chips" }], defaultIndex: 0 };
      const topping = { options: [{ name: "Almond" }], maxSelect: 1 };
      const comboPrices = [
         { filling: "Choco Chips", topping: "Almond", price: 5000 },
      ];

      await createProduct({
         ...base,
         type: "TYPE5",
         category: "Bread",
         subcategory: "CINROLLS VAN DEPOK",
         flavor: "Cinnamon",
         breadSizes: [{ key: "PERSONAL", price: 75000 }],
         filling,
         topping,
         comboPrices,
      });
      expect(created()).toMatchObject({
         subcategory: "CINROLLS VAN DEPOK",
         flavor: "Cinnamon",
         filling,
         topping,
         comboPrices,
      });
   });

   it("sub-kategori selain Cinrolls tidak menyimpan filling & topping", async () => {
      await createProduct({
         ...base,
         type: "TYPE5",
         category: "Bread",
         subcategory: "MOZZARELLA SAUSAGE ROLLS",
         flavor: "Mozzarella",
         breadSizes: [{ key: "FAMILY", price: 115000 }],
         filling: { options: [{ name: "Keju" }] },
         topping: { options: [{ name: "Almond" }] },
         comboPrices: [],
      });
      expect(created()).toMatchObject({
         filling: null,
         topping: null,
         comboPrices: null,
      });
   });

   it("Basque: satu varian bulat per ukuran", async () => {
      await createProduct({
         ...base,
         type: "TYPE5",
         category: "Cheese Cake",
         subcategory: "BASQUE BURNT CHEESE CAKE",
         flavor: "Original",
         variants: [
            { size: 14, price: 150000 },
            { size: 18, price: 250000 },
         ],
      });
      expect(created().variants.create).toEqual([
         { shape: "ROUND", size: 14, sizeB: null, price: 150000 },
         { shape: "ROUND", size: 18, sizeB: null, price: 250000 },
      ]);
   });

   it("brownies kotak menyimpan dua ukuran", async () => {
      // Cadbury Premium Fudge Brownies, 22x10
      await createProduct({
         ...base,
         type: "TYPE5",
         category: "Brownies",
         subcategory: "SIGNATURE PREMIUM FUDGE BROWNIES",
         flavor: "Cadbury",
         shape: "SQUARE",
         size: 22,
         sizeB: 10,
         price: 75000,
      });
      expect(created().variants.create).toEqual([
         { shape: "SQUARE", size: 22, sizeB: 10, price: 75000 },
      ]);
   });

   it("bentuk bulat mengabaikan ukuran kedua", async () => {
      await createProduct({
         ...base,
         type: "TYPE5",
         category: "Brownies",
         subcategory: "SIGNATURE PREMIUM FUDGE BROWNIES",
         flavor: "Cadbury",
         shape: "ROUND",
         size: 20,
         sizeB: 10,
         price: 75000,
      });
      expect(created().variants.create[0].sizeB).toBeNull();
   });
});

describe("createProduct: TYPE6", () => {
   it("American Butter: size berarti isi box, rasa disimpan", async () => {
      // Nutella Cupcakes
      await createProduct({
         ...base,
         type: "TYPE6",
         category: "American Butter Cupcakes",
         flavor: "Nutella",
         variants: [
            { size: 4, price: 100000 },
            { size: 6, price: 150000, image: IMG2 },
         ],
      });
      expect(created()).toMatchObject({
         flavor: "Nutella",
         subcategory: null,
         variants: {
            create: [
               { shape: null, size: 4, price: 100000, image: null },
               { shape: null, size: 6, price: 150000, image: IMG2 },
            ],
         },
      });
   });

   it("Simple Decor: rasa tidak disimpan karena dipilih pembeli", async () => {
      await createProduct({
         ...base,
         type: "TYPE6",
         category: "Simple Decor Cupcakes",
         flavor: "Nutella",
         variants: [{ size: 4, price: 100000 }],
      });
      expect(created().flavor).toBeNull();
   });

   it("Goodiebag: tanpa isi box, sub-kategori disimpan", async () => {
      await createProduct({
         ...base,
         type: "TYPE6",
         category: "Goodiebag Cupcakes",
         subcategory: "Custom Goodiebag",
         variants: [{ price: 28000 }],
      });
      expect(created()).toMatchObject({
         subcategory: "Custom Goodiebag",
         variants: {
            create: [{ shape: null, size: null, price: 28000, image: null }],
         },
      });
   });
});

// =========================
// READ
// =========================

describe("pembacaan produk", () => {
   it("detail produk yang tidak ada dijawab 404", async () => {
      productRepository.findProductById.mockResolvedValue(null);
      await expect(getProductById("prod-x")).rejects.toMatchObject({
         statusCode: 404,
         message: "Product tidak ditemukan",
      });
   });

   // Komentar di getProductById menyebut "tidak ada" tidak ikut tersimpan di
   // cache, padahal cached() menyimpan null juga. Lihat bagian "Temuan" di
   // RENCANA-TESTING.md.
   it("jawaban 'tidak ada' ikut tersimpan di cache", async () => {
      productRepository.findProductById.mockResolvedValue(null);
      await expect(getProductById("prod-x")).rejects.toThrow();
      await expect(getProductById("prod-x")).rejects.toThrow();
      expect(productRepository.findProductById).toHaveBeenCalledTimes(1);
   });

   it("detail produk memakai cache", async () => {
      productRepository.findProductById.mockResolvedValue({ id: "prod-1" });
      await getProductById("prod-1");
      await getProductById("prod-1");
      expect(productRepository.findProductById).toHaveBeenCalledTimes(1);
   });

   it("daftar produk punya cache sendiri per kategori", async () => {
      productRepository.findAllProducts.mockResolvedValue([]);
      await getAllProducts();
      await getAllProducts("Brownies");
      await getAllProducts("Brownies");

      expect(productRepository.findAllProducts).toHaveBeenCalledTimes(2);
      expect(productRepository.findAllProducts).toHaveBeenCalledWith(
         "Brownies"
      );
   });

   it("jumlah produk memakai cache", async () => {
      productRepository.countProducts.mockResolvedValue(35);
      await expect(getProductCount()).resolves.toBe(35);
      await getProductCount();
      expect(productRepository.countProducts).toHaveBeenCalledTimes(1);
   });

   it("pencarian merapikan spasi di kata kunci", async () => {
      productRepository.searchProductsByKeyword.mockResolvedValue([]);
      await searchProducts("  brownies ");
      expect(productRepository.searchProductsByKeyword).toHaveBeenCalledWith(
         "brownies"
      );
   });

   it("pencarian tanpa kata kunci ditolak", async () => {
      await expect(searchProducts("   ")).rejects.toMatchObject({
         statusCode: 400,
         message: "Keyword pencarian wajib diisi",
      });
      await expect(searchProducts()).rejects.toMatchObject({ statusCode: 400 });
   });
});

// =========================
// UPDATE
// =========================

describe("updateProduct: aturan umum", () => {
   it("produk yang tidak ada dijawab 404", async () => {
      productRepository.findProductById.mockResolvedValue(null);
      await expect(
         updateProduct("prod-x", { name: "Baru" })
      ).rejects.toMatchObject({ statusCode: 404 });
   });

   it("data rusak ditolak tanpa menulis apa pun", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-1",
         type: "TYPE1",
         variants: [{ id: "var-1" }],
      });
      await expect(
         updateProduct("prod-1", { price: -1 })
      ).rejects.toMatchObject({ statusCode: 422, message: "Validasi gagal" });
      expect(
         productRepository.updateType1ProductPartial
      ).not.toHaveBeenCalled();
      expect(triggerRebuild).not.toHaveBeenCalled();
   });

   // Tipe diambil dari basis data; skema update tiap tipe tidak mengenal
   // `type`, jadi nilainya dibuang.
   it("tipe produk tidak bisa diganti", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-1",
         type: "TYPE1",
         variants: [{ id: "var-1" }],
      });
      await updateProduct("prod-1", { type: "TYPE4", name: "Baru" });

      const [, fields] =
         productRepository.updateType1ProductPartial.mock.calls[0];
      expect(fields).toEqual({ name: "Baru" });
   });

   it("membersihkan cache dan memicu build ulang", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-1",
         type: "TYPE1",
         variants: [{ id: "var-1" }],
      });
      await getProductById("prod-1");

      await updateProduct("prod-1", { name: "Baru" });
      await getProductById("prod-1");

      // 1x baca awal, 1x di dalam updateProduct, 1x setelah cache dibersihkan
      expect(productRepository.findProductById).toHaveBeenCalledTimes(3);
      expect(triggerRebuild).toHaveBeenCalledWith("product changed");
   });
});

describe("updateProduct: satu varian (TYPE1, TYPE2, TYPE5 biasa)", () => {
   // Choco Cream Shortcake Series
   const shortcake = {
      id: "prod-1",
      type: "TYPE1",
      category: "Signature Shortcake Series",
      variants: [{ id: "var-1", shape: "ROUND", size: 14, price: "100000" }],
   };

   const lastCall = () =>
      productRepository.updateType1ProductPartial.mock.calls[0];

   beforeEach(() => {
      productRepository.findProductById.mockResolvedValue(shortcake);
   });

   it("mengubah harga saja: bentuk & ukuran lama dipertahankan", async () => {
      await updateProduct("prod-1", { price: 110000 });
      expect(lastCall()).toEqual([
         "prod-1",
         {},
         "var-1",
         { shape: "ROUND", size: 14, price: 110000 },
      ]);
   });

   it("mengubah nama saja: varian tidak disentuh", async () => {
      await updateProduct("prod-1", { name: "Baru" });
      expect(lastCall()[3]).toBeNull();
   });

   // Kalau diskon ikut terkirim sebagai 0, mengubah nama saja akan
   // menghapus diskon yang sedang berjalan.
   it("mengubah nama tidak menyentuh diskon", async () => {
      await updateProduct("prod-1", { name: "Baru" });
      expect(lastCall()[1]).not.toHaveProperty("discount");
   });

   it("mengganti foto juga mengganti cover", async () => {
      await updateProduct("prod-1", { images: [IMG2, IMG] });
      expect(lastCall()[1]).toEqual({ images: [IMG2, IMG], image: IMG2 });
   });

   it("TYPE5: ganti ke bulat mengosongkan ukuran kedua", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-2",
         type: "TYPE5",
         category: "Brownies",
         subcategory: "SIGNATURE PREMIUM FUDGE BROWNIES",
         variants: [
            {
               id: "var-2",
               shape: "SQUARE",
               size: 22,
               sizeB: 10,
               price: "75000",
            },
         ],
      });
      await updateProduct("prod-2", { shape: "ROUND", size: 20 });
      expect(lastCall()[3]).toEqual({
         shape: "ROUND",
         size: 20,
         sizeB: null,
         price: "75000",
      });
   });

   it("TYPE5: pindah dari Cinrolls ke Mozzarella mengosongkan filling & topping", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-3",
         type: "TYPE5",
         category: "Bread",
         subcategory: "CINROLLS VAN DEPOK",
         variants: [{ id: "var-3" }],
      });
      await updateProduct("prod-3", {
         subcategory: "MOZZARELLA SAUSAGE ROLLS",
      });
      expect(lastCall()[1]).toEqual({
         subcategory: "MOZZARELLA SAUSAGE ROLLS",
         filling: null,
         topping: null,
         comboPrices: null,
      });
   });

   it("TYPE5: Cinrolls yang hanya diganti namanya tetap menyimpan filling", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-3",
         type: "TYPE5",
         category: "Bread",
         subcategory: "CINROLLS VAN DEPOK",
         variants: [{ id: "var-3" }],
      });
      await updateProduct("prod-3", { name: "Cinnamon Rolls" });
      expect(lastCall()[1]).toEqual({ name: "Cinnamon Rolls" });
   });
});

describe("updateProduct: varian diganti utuh", () => {
   const replaceCall = () =>
      productRepository.replaceProductVariants.mock.calls[0];

   it("Bread: ukuran bernama diubah menjadi dimensi tetap", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-3",
         type: "TYPE5",
         category: "Bread",
         subcategory: "CINROLLS VAN DEPOK",
         variants: [],
      });
      await updateProduct("prod-3", {
         breadSizes: [{ key: "FAMILY", price: 120000 }],
      });
      expect(replaceCall()).toEqual([
         "prod-3",
         {},
         [
            {
               shape: "ROUND",
               size: 25,
               sizeB: null,
               price: 120000,
               image: null,
            },
         ],
      ]);
   });

   it("Basque: varian per ukuran berbentuk bulat", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-4",
         type: "TYPE5",
         category: "Cheese Cake",
         subcategory: "BASQUE BURNT CHEESE CAKE",
         variants: [],
      });
      await updateProduct("prod-4", {
         subcategory: "BASQUE BURNT CHEESE CAKE",
         variants: [{ size: 16, price: 185000 }],
      });
      expect(replaceCall()[2]).toEqual([
         { shape: "ROUND", size: 16, price: 185000 },
      ]);
   });

   it("TYPE6: pindah ke kategori yang rasanya dipilih pembeli mengosongkan rasa", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-5",
         type: "TYPE6",
         category: "American Butter Cupcakes",
         flavor: "Nutella",
         variants: [],
      });
      await updateProduct("prod-5", {
         category: "Simple Decor Cupcakes",
         variants: [{ size: 4, price: 100000 }],
      });
      expect(replaceCall()).toEqual([
         "prod-5",
         {
            category: "Simple Decor Cupcakes",
            flavor: null,
            subcategory: null,
         },
         [{ size: 4, price: 100000 }],
      ]);
   });

   it("TYPE6: American Butter tetap menyimpan rasanya", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-5",
         type: "TYPE6",
         category: "American Butter Cupcakes",
         flavor: "Nutella",
         variants: [],
      });
      await updateProduct("prod-5", { flavor: "Nutella Oreo" });
      expect(replaceCall()[1]).toEqual({
         flavor: "Nutella Oreo",
         subcategory: null,
      });
   });

   // Tombol "pajang di Home" di admin hanya mengirim { featured }.
   it("TYPE6: mengubah featured saja tidak mengirim varian baru", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-6",
         type: "TYPE6",
         category: "Goodiebag Cupcakes",
         subcategory: "Custom Goodiebag",
         variants: [],
      });
      await updateProduct("prod-6", { featured: true });
      // flavor ikut dikosongkan karena goodiebag tidak punya rasa tetap;
      // sub-kategorinya tidak disentuh.
      expect(replaceCall()).toEqual([
         "prod-6",
         { featured: true, flavor: null },
         [],
      ]);
   });
});

describe("updateProduct: grid varian (TYPE3 & TYPE4)", () => {
   it("meneruskan varian yang diubah dan yang dihapus", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-7",
         type: "TYPE4",
         category: "Custom Exclusive Figurine Cake",
         variants: [],
      });
      await updateProduct("prod-7", {
         variants: [{ shape: "ROUND", size: 20, price: 450000 }],
         removeVariants: [{ shape: "SQUARE", size: 30 }],
      });
      expect(
         productRepository.updatePartialProductWithVariants
      ).toHaveBeenCalledWith(
         "prod-7",
         {},
         [{ shape: "ROUND", size: 20, price: 450000 }],
         [{ shape: "SQUARE", size: 30 }]
      );
   });

   it("tanpa varian mengirim daftar kosong", async () => {
      productRepository.findProductById.mockResolvedValue({
         id: "prod-7",
         type: "TYPE3",
         variants: [],
      });
      await updateProduct("prod-7", { name: "Baru" });
      expect(
         productRepository.updatePartialProductWithVariants
      ).toHaveBeenCalledWith("prod-7", { name: "Baru" }, [], []);
   });
});

// =========================
// DELETE
// =========================

describe("removeProduct", () => {
   it("produk yang tidak ada dijawab 404 tanpa menghapus apa pun", async () => {
      productRepository.findProductById.mockResolvedValue(null);
      await expect(removeProduct("prod-x")).rejects.toMatchObject({
         statusCode: 404,
      });
      expect(productRepository.deleteProduct).not.toHaveBeenCalled();
      expect(triggerRebuild).not.toHaveBeenCalled();
   });

   it("menghapus produk, membersihkan cache, dan memicu build ulang", async () => {
      productRepository.findProductById.mockResolvedValue({ id: "prod-1" });
      productRepository.findAllProducts.mockResolvedValue([]);
      await getAllProducts();

      await removeProduct("prod-1");
      await getAllProducts();

      expect(productRepository.deleteProduct).toHaveBeenCalledWith("prod-1");
      expect(productRepository.findAllProducts).toHaveBeenCalledTimes(2);
      expect(triggerRebuild).toHaveBeenCalledWith("product changed");
   });
});
