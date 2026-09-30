import { describe, it, expect, beforeEach, vi } from "vitest";
import {
   applyDiscount,
   addItemToCart,
   getCartByUserId,
   updateItemQuantity,
   removeItem,
   clearCart,
} from "./cart.service.js";
import * as cartRepository from "./cart.repository.js";
import * as productRepository from "../product/product.repository.js";

vi.mock("./cart.repository.js");
vi.mock("../product/product.repository.js");

// Harga diambil dari produk yang benar-benar dijual. Diskon di toko saat ini
// semuanya 0, jadi persen diskon di bawah adalah contoh.
describe("applyDiscount", () => {
   it("mengembalikan harga dasar kalau diskon 0", () => {
      // Shortcake Series 14cm
      expect(applyDiscount(100000, 0)).toBe(100000);
   });

   it("memotong 10% dari harga dasar", () => {
      expect(applyDiscount(100000, 10)).toBe(90000);
   });

   it("menganggap diskon null sebagai tanpa diskon", () => {
      expect(applyDiscount(65000, null)).toBe(65000);
   });

   it("menganggap diskon undefined sebagai tanpa diskon", () => {
      expect(applyDiscount(65000, undefined)).toBe(65000);
   });

   it("menerima harga dan diskon dalam bentuk teks, seperti Decimal dari Prisma", () => {
      expect(applyDiscount("150000", "10.00")).toBe(135000);
   });

   it("mengembalikan angka, bukan teks", () => {
      expect(typeof applyDiscount("150000", 0)).toBe("number");
   });

   it("menyisakan desimal kalau hasilnya tidak bulat", () => {
      // Brownies 75.000 diskon 15% = 63.750; goodiebag 26.000 diskon 12,5%
      expect(applyDiscount(75000, 15)).toBe(63750);
      expect(applyDiscount(26000, 12.5)).toBe(22750);
      expect(applyDiscount(27000, 33.3)).toBe(18009);
   });

   it("membulatkan ke 2 desimal", () => {
      // 28.000 - 28.000 x 33,33% = 18.667,6
      expect(applyDiscount(28000, 33.33)).toBe(18667.6);
      // 99.999 - 99.999 x 33,33% = 66.669,3333...
      expect(applyDiscount(99999, 33.33)).toBe(66669.33);
   });

   it("mengembalikan 0 untuk diskon 100%", () => {
      expect(applyDiscount(100000, 100)).toBe(0);
   });
});

// =========================
// addItemToCart: harga per tipe produk
// =========================

const USER = "user-1";

// Produk & harga di bawah meniru produk yang benar-benar dijual.
const product = (fields) => ({
   id: "prod-1",
   discount: "0",
   subcategory: null,
   filling: null,
   topping: null,
   comboPrices: null,
   ...fields,
});

const variant = (fields) => ({ id: "var-1", productId: "prod-1", ...fields });

const add = (prod, payload = {}) => {
   productRepository.findProductById.mockResolvedValue(prod);
   return addItemToCart(USER, { productId: prod?.id, quantity: 1, ...payload });
};

// Data yang diserahkan ke repository untuk disimpan sebagai baris keranjang.
const savedItem = () => cartRepository.createCartItem.mock.calls[0][0];

beforeEach(() => {
   vi.resetAllMocks();
   cartRepository.findOrCreateCart.mockResolvedValue({ id: "cart-1" });
   cartRepository.findMatchingCartItem.mockResolvedValue(null);
   cartRepository.createCartItem.mockImplementation(async (data) => data);
});

describe("addItemToCart: aturan umum", () => {
   it("menolak jumlah 0", async () => {
      await expect(
         add(product({ type: "TYPE1" }), { quantity: 0 })
      ).rejects.toMatchObject({
         statusCode: 422,
         message: "quantity minimal 1",
      });
   });

   it("menolak produk yang tidak ada", async () => {
      await expect(add(null)).rejects.toMatchObject({
         statusCode: 404,
         message: "Produk tidak ditemukan",
      });
   });

   it("menolak tipe produk yang tidak dikenal", async () => {
      await expect(add(product({ type: "TYPE9" }))).rejects.toMatchObject({
         statusCode: 422,
         message: "Tipe produk tidak dikenali",
      });
   });

   it("mengabaikan harga yang dikirim client", async () => {
      productRepository.findSingleVariantByProductId.mockResolvedValue(
         variant({ price: "100000" })
      );
      await add(product({ type: "TYPE1" }), { price: 1 });
      expect(savedItem().price).toBe(100000);
   });

   it("menambah jumlah baris yang sama, bukan membuat baris baru", async () => {
      productRepository.findSingleVariantByProductId.mockResolvedValue(
         variant({ price: "100000" })
      );
      cartRepository.findMatchingCartItem.mockResolvedValue({ id: "item-9" });

      await add(product({ type: "TYPE1" }), { quantity: 2 });

      expect(cartRepository.incrementCartItemQuantity).toHaveBeenCalledWith(
         "item-9",
         2
      );
      expect(cartRepository.createCartItem).not.toHaveBeenCalled();
   });

   it("mencari baris yang sama berdasarkan produk, varian, rasa, filling, dan topping", async () => {
      productRepository.findVariantById.mockResolvedValue(
         variant({ price: "375000" })
      );
      await add(product({ type: "TYPE4" }), {
         variantId: "var-1",
         flavor: "Oreo Cheese",
      });

      expect(cartRepository.findMatchingCartItem).toHaveBeenCalledWith({
         cartId: "cart-1",
         productId: "prod-1",
         variantId: "var-1",
         flavor: "Oreo Cheese",
         filling: undefined,
         topping: undefined,
      });
   });
});

describe("addItemToCart: TYPE1", () => {
   // Choco Cream Shortcake Series, 14cm, Rp100.000
   const shortcake = product({
      type: "TYPE1",
      category: "Signature Shortcake Series",
   });

   beforeEach(() => {
      productRepository.findSingleVariantByProductId.mockResolvedValue(
         variant({ shape: "ROUND", size: 14, price: "100000" })
      );
   });

   it("menyimpan harga dasar", async () => {
      await add(shortcake, { quantity: 2, textOnCake: "HBD", notes: "-" });
      expect(savedItem()).toMatchObject({
         cartId: "cart-1",
         productId: "prod-1",
         variantId: null,
         flavor: null,
         customImage: null,
         textOnCake: "HBD",
         notes: "-",
         quantity: 2,
         price: 100000,
      });
   });

   it("menyimpan harga setelah diskon", async () => {
      await add({ ...shortcake, discount: "10.00" });
      expect(savedItem().price).toBe(90000);
   });

   it("mengabaikan rasa dan gambar yang dikirim client", async () => {
      await add(shortcake, { flavor: "Blackforest", customImage: "x.jpg" });
      expect(savedItem()).toMatchObject({ flavor: null, customImage: null });
   });

   it("menolak kalau produk belum punya varian", async () => {
      productRepository.findSingleVariantByProductId.mockResolvedValue(null);
      await expect(add(shortcake)).rejects.toMatchObject({
         statusCode: 422,
         message: "Variant untuk produk ini belum tersedia",
      });
   });
});

describe("addItemToCart: TYPE2", () => {
   // Potrait Theme Paper Topper Petite Cake, 10cm, Rp75.000
   const petite = product({
      type: "TYPE2",
      category: "Paper Topper Petite Cake",
   });

   beforeEach(() => {
      productRepository.findSingleVariantByProductId.mockResolvedValue(
         variant({ shape: "ROUND", size: 10, price: "75000" })
      );
   });

   it("menerima rasa yang sah dan menyimpan acuan desain", async () => {
      await add(petite, {
         flavor: "Vanilla Strawberry",
         customImage: "https://contoh/desain.jpg",
      });
      expect(savedItem()).toMatchObject({
         variantId: null,
         flavor: "Vanilla Strawberry",
         customImage: "https://contoh/desain.jpg",
         price: 75000,
      });
   });

   it("menolak rasa milik TYPE4", async () => {
      await expect(
         add(petite, { flavor: "Blackforest" })
      ).rejects.toMatchObject({
         statusCode: 422,
         message:
            "flavor tidak valid, pilih salah satu: Double Choco, Choco Blueberry, Vanilla Cheese, Vanilla Strawberry",
      });
   });

   it("menolak tanpa rasa", async () => {
      await expect(add(petite)).rejects.toMatchObject({
         statusCode: 422,
         message: "flavor wajib diisi untuk tipe produk ini",
      });
   });
});

describe("addItemToCart: TYPE3", () => {
   // Double Choco Custard Cake, bulat 20cm, Rp200.000
   const custard = product({
      type: "TYPE3",
      category: "Signature Original Cake Series",
   });

   it("memakai harga varian yang dipilih", async () => {
      productRepository.findVariantById.mockResolvedValue(
         variant({ id: "var-r20", shape: "ROUND", size: 20, price: "200000" })
      );
      await add(custard, { variantId: "var-r20" });

      expect(productRepository.findVariantById).toHaveBeenCalledWith("var-r20");
      expect(savedItem()).toMatchObject({
         variantId: "var-r20",
         flavor: null,
         customImage: null,
         price: 200000,
      });
   });

   it("menerapkan diskon ke harga varian", async () => {
      productRepository.findVariantById.mockResolvedValue(
         variant({ price: "750000" })
      );
      await add({ ...custard, discount: "20" }, { variantId: "var-1" });
      expect(savedItem().price).toBe(600000);
   });

   // Tanpa pemeriksaan ini, pembeli bisa memasangkan varian murah milik
   // produk lain ke produk mahal.
   it("menolak varian milik produk lain", async () => {
      productRepository.findVariantById.mockResolvedValue(
         variant({ productId: "prod-murah", price: "65000" })
      );
      await expect(add(custard, { variantId: "var-1" })).rejects.toMatchObject({
         statusCode: 404,
         message: "Variant tidak ditemukan untuk produk ini",
      });
      expect(cartRepository.createCartItem).not.toHaveBeenCalled();
   });

   it("menolak varian yang tidak ada", async () => {
      productRepository.findVariantById.mockResolvedValue(null);
      await expect(add(custard, { variantId: "var-x" })).rejects.toMatchObject({
         statusCode: 404,
      });
   });

   it("menolak tanpa varian", async () => {
      await expect(add(custard)).rejects.toMatchObject({
         statusCode: 422,
         message: "variantId wajib diisi untuk tipe produk ini",
      });
   });
});

describe("addItemToCart: TYPE4", () => {
   // Kuromi Theme Exclusive Figurine Cake, bulat 18cm, Rp375.000
   const kuromi = product({
      type: "TYPE4",
      category: "Custom Exclusive Figurine Cake",
   });

   beforeEach(() => {
      productRepository.findVariantById.mockResolvedValue(
         variant({ id: "var-r18", shape: "ROUND", size: 18, price: "375000" })
      );
   });

   it("menyimpan bentuk & ukuran, rasa, dan acuan desain", async () => {
      await add(kuromi, {
         variantId: "var-r18",
         flavor: "Snow White Double Cheese",
         customImage: "https://contoh/kuromi.jpg",
      });
      expect(savedItem()).toMatchObject({
         variantId: "var-r18",
         flavor: "Snow White Double Cheese",
         customImage: "https://contoh/kuromi.jpg",
         price: 375000,
      });
   });

   it("menolak rasa milik TYPE2", async () => {
      await expect(
         add(kuromi, { variantId: "var-r18", flavor: "Double Choco" })
      ).rejects.toMatchObject({ statusCode: 422 });
   });

   it("menolak tanpa rasa", async () => {
      await expect(add(kuromi, { variantId: "var-r18" })).rejects.toMatchObject(
         {
            statusCode: 422,
            message: "flavor wajib diisi untuk tipe produk ini",
         }
      );
   });
});

describe("addItemToCart: TYPE5", () => {
   it("brownies memakai satu-satunya varian tanpa menyimpan variantId", async () => {
      // Cadbury Premium Fudge Brownies, 22x10, Rp75.000
      productRepository.findSingleVariantByProductId.mockResolvedValue(
         variant({ shape: "SQUARE", size: 22, sizeB: 10, price: "75000" })
      );
      await add(
         product({
            type: "TYPE5",
            category: "Brownies",
            subcategory: "SIGNATURE PREMIUM FUDGE BROWNIES",
         }),
         { variantId: "var-lain" }
      );

      expect(productRepository.findVariantById).not.toHaveBeenCalled();
      expect(savedItem()).toMatchObject({
         variantId: null,
         filling: null,
         topping: null,
         price: 75000,
      });
   });

   describe("Basque (pilihan ukuran)", () => {
      const basque = product({
         type: "TYPE5",
         category: "Cheese Cake",
         subcategory: "BASQUE BURNT CHEESE CAKE",
      });

      it("memakai harga ukuran yang dipilih", async () => {
         productRepository.findVariantById.mockResolvedValue(
            variant({ id: "var-16", shape: "ROUND", size: 16, price: "185000" })
         );
         await add(basque, { variantId: "var-16" });
         expect(savedItem()).toMatchObject({
            variantId: "var-16",
            flavor: null,
            price: 185000,
         });
      });

      it("menolak tanpa ukuran", async () => {
         await expect(add(basque)).rejects.toMatchObject({
            statusCode: 422,
            message: "variantId (ukuran) wajib dipilih",
         });
      });
   });

   describe("Bread (ukuran bernama)", () => {
      // Mozzarella Sausage Rolls tidak punya filling & topping.
      const mozzarella = product({
         type: "TYPE5",
         category: "Bread",
         subcategory: "MOZZARELLA SAUSAGE ROLLS",
      });

      it("menyimpan ukuran yang dipilih beserta harganya", async () => {
         productRepository.findVariantById.mockResolvedValue(
            variant({
               id: "var-family",
               shape: "ROUND",
               size: 25,
               price: "115000",
            })
         );
         await add(mozzarella, { variantId: "var-family" });
         expect(savedItem()).toMatchObject({
            variantId: "var-family",
            filling: null,
            topping: null,
            price: 115000,
         });
      });

      it("menolak tanpa ukuran", async () => {
         await expect(add(mozzarella)).rejects.toMatchObject({
            statusCode: 422,
            message: "variantId (ukuran) wajib dipilih",
         });
      });

      it("menolak ukuran milik produk lain", async () => {
         productRepository.findVariantById.mockResolvedValue(
            variant({ productId: "prod-lain", price: "75000" })
         );
         await expect(
            add(mozzarella, { variantId: "var-1" })
         ).rejects.toMatchObject({
            statusCode: 404,
            message: "Ukuran tidak ditemukan untuk produk ini",
         });
      });
   });

   describe("Cinrolls (filling & topping)", () => {
      // Cinnamon Rolls With Cream Cheese Frosting. Daftar filling sama dengan
      // di toko; topping dan harga kombinasi adalah contoh.
      const cinrolls = product({
         type: "TYPE5",
         category: "Bread",
         subcategory: "CINROLLS VAN DEPOK",
         filling: {
            options: [
               { name: "No Filling" },
               { name: "Kismis / Raisin" },
               { name: "Choco Chips" },
            ],
            defaultIndex: 1,
         },
         topping: {
            options: [
               { name: "Cream Cheese" },
               { name: "Almond" },
               { name: "Oreo" },
               { name: "Meses" },
            ],
            maxSelect: 3,
         },
         comboPrices: [
            { filling: "Choco Chips", topping: "Cream Cheese", price: 3000 },
            { filling: "Choco Chips", topping: "Almond", price: "5000" },
            { filling: "Kismis / Raisin", topping: "Almond", price: 4000 },
         ],
      });

      beforeEach(() => {
         // Personal Size, Rp75.000
         productRepository.findVariantById.mockResolvedValue(
            variant({
               id: "var-personal",
               shape: "SQUARE",
               size: 22,
               sizeB: 10,
               price: "75000",
            })
         );
      });

      it("harga = harga ukuran + jumlah harga kombinasi tiap topping", async () => {
         await add(cinrolls, {
            variantId: "var-personal",
            filling: "Choco Chips",
            toppings: ["Almond", "Cream Cheese"],
         });
         // 75.000 + 5.000 (Choco Chips x Almond) + 3.000 (x Cream Cheese)
         expect(savedItem().price).toBe(83000);
      });

      it("kombinasi yang tidak terdaftar tidak menambah harga", async () => {
         await add(cinrolls, {
            variantId: "var-personal",
            filling: "No Filling",
            toppings: ["Oreo"],
         });
         expect(savedItem().price).toBe(75000);
      });

      it("diskon hanya berlaku untuk harga ukuran, bukan harga kombinasi", async () => {
         await add(
            { ...cinrolls, discount: "10" },
            {
               variantId: "var-personal",
               filling: "Choco Chips",
               toppings: ["Almond"],
            }
         );
         // 75.000 - 10% = 67.500, lalu + 5.000
         expect(savedItem().price).toBe(72500);
      });

      it("memakai filling bawaan kalau pembeli tidak memilih", async () => {
         await add(cinrolls, {
            variantId: "var-personal",
            toppings: ["Almond"],
         });
         expect(savedItem()).toMatchObject({
            filling: "Kismis / Raisin",
            price: 79000,
         });
      });

      it("menyimpan topping sesuai urutan di pengaturan produk", async () => {
         await add(cinrolls, {
            variantId: "var-personal",
            toppings: ["Oreo", "Cream Cheese", "Oreo"],
         });
         expect(savedItem().topping).toBe("Cream Cheese, Oreo");
      });

      it("menolak lebih dari batas topping", async () => {
         await expect(
            add(cinrolls, {
               variantId: "var-personal",
               toppings: ["Cream Cheese", "Almond", "Oreo", "Meses"],
            })
         ).rejects.toMatchObject({
            statusCode: 422,
            message: "Maksimal memilih 3 topping",
         });
      });

      it("batas topping tidak pernah lebih dari 3 walau pengaturan produk lebih besar", async () => {
         await expect(
            add(
               { ...cinrolls, topping: { ...cinrolls.topping, maxSelect: 6 } },
               {
                  variantId: "var-personal",
                  toppings: ["Cream Cheese", "Almond", "Oreo", "Meses"],
               }
            )
         ).rejects.toMatchObject({ message: "Maksimal memilih 3 topping" });
      });

      it("menolak tanpa topping", async () => {
         await expect(
            add(cinrolls, { variantId: "var-personal", toppings: [] })
         ).rejects.toMatchObject({
            statusCode: 422,
            message: "Wajib memilih minimal satu topping",
         });
      });

      it("menolak topping yang tidak ada", async () => {
         await expect(
            add(cinrolls, { variantId: "var-personal", toppings: ["Keju"] })
         ).rejects.toMatchObject({ message: "Topping tidak valid: Keju" });
      });

      it("menolak filling yang tidak ada", async () => {
         await expect(
            add(cinrolls, {
               variantId: "var-personal",
               filling: "Durian",
               toppings: ["Almond"],
            })
         ).rejects.toMatchObject({ message: "Filling tidak valid: Durian" });
      });

      it("baris dengan topping berbeda dianggap barang berbeda", async () => {
         await add(cinrolls, {
            variantId: "var-personal",
            filling: "Choco Chips",
            toppings: ["Almond"],
         });
         expect(cartRepository.findMatchingCartItem).toHaveBeenCalledWith(
            expect.objectContaining({
               filling: "Choco Chips",
               topping: "Almond",
            })
         );
      });
   });
});

describe("addItemToCart: TYPE6", () => {
   describe("American Butter (rasa ditentukan admin)", () => {
      // Nutella Cupcakes, isi 6, Rp150.000
      const nutella = product({
         type: "TYPE6",
         category: "American Butter Cupcakes",
      });

      beforeEach(() => {
         productRepository.findVariantById.mockResolvedValue(
            variant({ id: "var-box6", size: 6, price: "150000" })
         );
      });

      it("memakai harga box yang dipilih", async () => {
         await add(nutella, { variantId: "var-box6" });
         expect(savedItem()).toMatchObject({
            variantId: "var-box6",
            price: 150000,
         });
      });

      it("tidak menyimpan rasa dan gambar dari client", async () => {
         await add(nutella, {
            variantId: "var-box6",
            flavor: "Double Choco Cupcakes",
            customImage: "x.jpg",
         });
         expect(savedItem()).toMatchObject({ flavor: null, customImage: null });
      });

      it("menolak tanpa isi box", async () => {
         await expect(add(nutella)).rejects.toMatchObject({
            statusCode: 422,
            message: "variantId (isi box) wajib dipilih",
         });
      });

      it("menolak box milik produk lain", async () => {
         productRepository.findVariantById.mockResolvedValue(
            variant({ productId: "prod-lain", price: "100000" })
         );
         await expect(
            add(nutella, { variantId: "var-1" })
         ).rejects.toMatchObject({
            statusCode: 404,
            message: "Isi box tidak ditemukan untuk produk ini",
         });
      });
   });

   describe("Simple Decor (pembeli memilih rasa)", () => {
      const simple = product({
         type: "TYPE6",
         category: "Simple Decor Cupcakes",
      });

      beforeEach(() => {
         productRepository.findVariantById.mockResolvedValue(
            variant({ id: "var-box4", size: 4, price: "100000" })
         );
      });

      it("menyimpan rasa dan acuan desain", async () => {
         await add(simple, {
            variantId: "var-box4",
            flavor: "Choco Blueberry Cupcakes",
            customImage: "https://contoh/cupcake.jpg",
         });
         expect(savedItem()).toMatchObject({
            flavor: "Choco Blueberry Cupcakes",
            customImage: "https://contoh/cupcake.jpg",
            price: 100000,
         });
      });

      it("menolak rasa cake biasa", async () => {
         await expect(
            add(simple, { variantId: "var-box4", flavor: "Double Choco" })
         ).rejects.toMatchObject({ statusCode: 422 });
      });

      it("menolak tanpa rasa", async () => {
         await expect(
            add(simple, { variantId: "var-box4" })
         ).rejects.toMatchObject({
            message: "flavor wajib diisi untuk cupcake ini",
         });
      });
   });

   describe("Goodiebag", () => {
      // American Butter goodiebag Cupcakes, Rp26.000 per paket
      const original = product({
         type: "TYPE6",
         category: "Goodiebag Cupcakes",
         subcategory: "Original Goodiebag",
      });
      // Kuromi Paper Topper Goodiebag Cupcakes
      const custom = product({
         type: "TYPE6",
         category: "Goodiebag Cupcakes",
         subcategory: "Custom Goodiebag",
      });

      beforeEach(() => {
         productRepository.findVariantById.mockResolvedValue(
            variant({ id: "var-gb", size: null, price: "26000" })
         );
      });

      it("menyimpan harga per paket dan rasa yang digabung", async () => {
         await add(original, {
            variantId: "var-gb",
            quantity: 10,
            flavors: ["Nutella", "Double Cheese"],
         });
         expect(savedItem()).toMatchObject({
            variantId: "var-gb",
            flavor: "Nutella, Double Cheese",
            customImage: null,
            quantity: 10,
            price: 26000,
         });
      });

      it("menolak pembelian kurang dari 10 paket", async () => {
         await expect(
            add(original, {
               variantId: "var-gb",
               quantity: 9,
               flavors: ["Nutella"],
            })
         ).rejects.toMatchObject({
            statusCode: 422,
            message: "Minimal pembelian 10 box",
         });
      });

      it("menolak lebih dari 4 rasa untuk Original", async () => {
         await expect(
            add(original, {
               variantId: "var-gb",
               quantity: 10,
               flavors: [
                  "Nutella",
                  "Double Cheese",
                  "Vanilla Oreo",
                  "Choco Oreo",
                  "Double Choco",
               ],
            })
         ).rejects.toMatchObject({
            message: "Pilih 1 sampai 4 rasa untuk goodiebag",
         });
      });

      it("menolak tanpa rasa", async () => {
         await expect(
            add(original, { variantId: "var-gb", quantity: 10 })
         ).rejects.toMatchObject({
            message: "Pilih 1 sampai 4 rasa untuk goodiebag",
         });
      });

      it("menolak rasa ganda", async () => {
         await expect(
            add(original, {
               variantId: "var-gb",
               quantity: 10,
               flavors: ["Nutella", "Nutella"],
            })
         ).rejects.toMatchObject({
            message: "Terdapat rasa yang terpilih ganda",
         });
      });

      it("menolak rasa milik sub-kategori lain", async () => {
         await expect(
            add(original, {
               variantId: "var-gb",
               quantity: 10,
               flavors: ["Double Choco Cupcakes"],
            })
         ).rejects.toMatchObject({
            message: "Rasa tidak valid: Double Choco Cupcakes",
         });
      });

      it("Custom hanya boleh 1 rasa", async () => {
         await expect(
            add(custom, {
               variantId: "var-gb",
               quantity: 10,
               flavors: ["Double Choco Cupcakes", "Vanilla Cheese Cupcakes"],
            })
         ).rejects.toMatchObject({
            message: "Pilih 1 sampai 1 rasa untuk goodiebag",
         });
      });
   });
});

// =========================
// Operasi keranjang lainnya
// =========================

describe("getCartByUserId", () => {
   it("mengembalikan keranjang kosong tanpa membuatnya di basis data", async () => {
      cartRepository.findCartWithItemsByUserId.mockResolvedValue(null);
      await expect(getCartByUserId(USER)).resolves.toEqual({
         id: null,
         items: [],
         subtotal: 0,
      });
      expect(cartRepository.createCart).not.toHaveBeenCalled();
   });

   it("menghitung total per baris dan subtotal dari harga yang tersimpan", async () => {
      cartRepository.findCartWithItemsByUserId.mockResolvedValue({
         id: "cart-1",
         items: [
            {
               id: "item-1",
               productId: "prod-1",
               product: { name: "Nutella Cupcakes", type: "TYPE6" },
               variant: { shape: null, size: 6, sizeB: null },
               quantity: 2,
               price: "150000",
            },
            {
               id: "item-2",
               productId: "prod-2",
               product: {
                  name: "Cadbury Premium Fudge Brownies",
                  type: "TYPE5",
               },
               variant: null,
               quantity: 1,
               price: "75000",
            },
         ],
      });

      const cart = await getCartByUserId(USER);

      expect(cart.subtotal).toBe(375000);
      expect(cart.items[0]).toMatchObject({
         productName: "Nutella Cupcakes",
         productType: "TYPE6",
         size: 6,
         price: 150000,
         lineTotal: 300000,
      });
      expect(cart.items[1]).toMatchObject({ size: null, lineTotal: 75000 });
   });
});

describe("updateItemQuantity", () => {
   const ownItem = {
      id: "item-1",
      cart: { userId: USER },
      product: { category: "Simple Decor Cupcakes" },
   };

   it("menolak barang milik pengguna lain", async () => {
      cartRepository.findCartItemById.mockResolvedValue({
         ...ownItem,
         cart: { userId: "user-lain" },
      });
      await expect(updateItemQuantity(USER, "item-1", 3)).rejects.toMatchObject(
         {
            statusCode: 404,
            message: "Item keranjang tidak ditemukan",
         }
      );
      expect(cartRepository.updateCartItemQuantity).not.toHaveBeenCalled();
   });

   it("menolak barang yang tidak ada", async () => {
      cartRepository.findCartItemById.mockResolvedValue(null);
      await expect(updateItemQuantity(USER, "item-x", 3)).rejects.toMatchObject(
         { statusCode: 404 }
      );
   });

   it("mengubah jumlah", async () => {
      cartRepository.findCartItemById.mockResolvedValue(ownItem);
      await updateItemQuantity(USER, "item-1", 3);
      expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith(
         "item-1",
         3
      );
   });

   it("jumlah 0 berarti hapus", async () => {
      cartRepository.findCartItemById.mockResolvedValue(ownItem);
      await expect(updateItemQuantity(USER, "item-1", 0)).resolves.toBeNull();
      expect(cartRepository.deleteCartItem).toHaveBeenCalledWith("item-1");
   });

   it("goodiebag tidak boleh turun di bawah 10 paket", async () => {
      cartRepository.findCartItemById.mockResolvedValue({
         ...ownItem,
         product: { category: "Goodiebag Cupcakes" },
      });
      await expect(updateItemQuantity(USER, "item-1", 9)).rejects.toMatchObject(
         { message: "Minimal pembelian 10 box" }
      );
   });

   it("goodiebag tetap boleh dihapus dengan jumlah 0", async () => {
      cartRepository.findCartItemById.mockResolvedValue({
         ...ownItem,
         product: { category: "Goodiebag Cupcakes" },
      });
      await updateItemQuantity(USER, "item-1", 0);
      expect(cartRepository.deleteCartItem).toHaveBeenCalledWith("item-1");
   });
});

describe("removeItem", () => {
   it("menolak barang milik pengguna lain", async () => {
      cartRepository.findCartItemById.mockResolvedValue({
         id: "item-1",
         cart: { userId: "user-lain" },
      });
      await expect(removeItem(USER, "item-1")).rejects.toMatchObject({
         statusCode: 404,
      });
      expect(cartRepository.deleteCartItem).not.toHaveBeenCalled();
   });

   it("menghapus barang milik sendiri", async () => {
      cartRepository.findCartItemById.mockResolvedValue({
         id: "item-1",
         cart: { userId: USER },
      });
      await removeItem(USER, "item-1");
      expect(cartRepository.deleteCartItem).toHaveBeenCalledWith("item-1");
   });
});

describe("clearCart", () => {
   it("mengosongkan isi keranjang", async () => {
      cartRepository.findCartByUserId.mockResolvedValue({ id: "cart-1" });
      await clearCart(USER);
      expect(cartRepository.deleteAllCartItems).toHaveBeenCalledWith("cart-1");
   });

   it("tidak melakukan apa pun kalau belum punya keranjang", async () => {
      cartRepository.findCartByUserId.mockResolvedValue(null);
      await clearCart(USER);
      expect(cartRepository.deleteAllCartItems).not.toHaveBeenCalled();
   });
});
