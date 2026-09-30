import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildTools, findMentionedProducts } from "./chat.tools.js";
import { getAllProducts, getProductById } from "../product/product.service.js";
import { getOrderHistory } from "../order/order.service.js";
import { addItemToCart, applyDiscount } from "../cart/cart.service.js";
import * as cartRepository from "../cart/cart.repository.js";
import * as productRepository from "../product/product.repository.js";

vi.mock("../product/product.service.js", () => ({
   getAllProducts: vi.fn(),
   getProductById: vi.fn(),
}));
vi.mock("../order/order.service.js", () => ({ getOrderHistory: vi.fn() }));
vi.mock("../../config/store.config.js", () => ({
   STORE_LOCATION: { lat: -6.4025, lng: 106.7942 },
   OWNER_WHATSAPP_NUMBER: "6281200000000",
}));
// Dipakai untuk membandingkan harga asisten dengan harga keranjang.
vi.mock("../cart/cart.repository.js");
vi.mock("../product/product.repository.js");

// Produk meniru katalog toko. Diskon adalah contoh; di toko saat ini 0.
const custard = {
   id: "prod-custard",
   name: "Double Choco Custard Cake",
   type: "TYPE3",
   category: "Signature Original Cake Series",
   subcategory: null,
   flavor: "Double Choco",
   description: "Kue cokelat dengan custard.",
   discount: "12.5",
   variants: [
      {
         id: "var-r16",
         productId: "prod-custard",
         shape: "ROUND",
         size: 16,
         sizeB: null,
         price: "135000",
      },
      {
         id: "var-r20",
         productId: "prod-custard",
         shape: "ROUND",
         size: 20,
         sizeB: null,
         price: "200000",
      },
      {
         id: "var-s20",
         productId: "prod-custard",
         shape: "SQUARE",
         size: 20,
         sizeB: null,
         price: "250000",
      },
   ],
};

const nutella = {
   id: "prod-nutella",
   name: "Nutella Cupcakes",
   type: "TYPE6",
   category: "American Butter Cupcakes",
   subcategory: null,
   flavor: "Nutella",
   description: "Cupcake nutella.",
   discount: "0",
   variants: [
      {
         id: "var-b4",
         productId: "prod-nutella",
         shape: null,
         size: 4,
         sizeB: null,
         price: "100000",
      },
      {
         id: "var-b6",
         productId: "prod-nutella",
         shape: null,
         size: 6,
         sizeB: null,
         price: "150000",
      },
   ],
};

const goodiebag = {
   id: "prod-goodiebag",
   name: "American Butter goodiebag Cupcakes",
   type: "TYPE6",
   category: "Goodiebag Cupcakes",
   subcategory: "Original Goodiebag",
   flavor: null,
   description: "Goodiebag cupcake.",
   discount: "0",
   variants: [
      {
         id: "var-gb",
         productId: "prod-goodiebag",
         shape: null,
         size: null,
         sizeB: null,
         price: "26000",
      },
   ],
};

const cinrolls = {
   id: "prod-cinrolls",
   name: "Cinnamon Rolls With Cream Cheese Frosting",
   type: "TYPE5",
   category: "Bread",
   subcategory: "CINROLLS VAN DEPOK",
   flavor: "Cinnamon",
   description: "Cinnamon roll.",
   discount: "0",
   filling: { options: [{ name: "No Filling" }, { name: "Choco Chips" }] },
   topping: null,
   comboPrices: [{ filling: "Choco Chips", topping: "Almond", price: 5000 }],
   variants: [
      {
         id: "var-p",
         productId: "prod-cinrolls",
         shape: "SQUARE",
         size: 22,
         sizeB: 10,
         price: "75000",
      },
      {
         id: "var-f",
         productId: "prod-cinrolls",
         shape: "ROUND",
         size: 25,
         sizeB: null,
         price: "115000",
      },
   ],
};

const CATALOG = [custard, nutella, goodiebag, cinrolls];

beforeEach(() => {
   vi.resetAllMocks();
   getAllProducts.mockResolvedValue(CATALOG);
   getProductById.mockImplementation(async (id) =>
      CATALOG.find((p) => p.id === id)
   );
});

const run = (name, args, userId = null) =>
   buildTools({ userId }).run(name, args);

describe("harga yang disebut asisten", () => {
   it("sama dengan harga yang disimpan keranjang untuk varian yang sama", async () => {
      productRepository.findProductById.mockResolvedValue(custard);
      cartRepository.findOrCreateCart.mockResolvedValue({ id: "cart-1" });
      cartRepository.findMatchingCartItem.mockResolvedValue(null);

      const detail = await run("detailProduk", { nama: custard.name });

      for (const [i, variant] of custard.variants.entries()) {
         productRepository.findVariantById.mockResolvedValue(variant);
         await addItemToCart("user-1", {
            productId: custard.id,
            variantId: variant.id,
            quantity: 1,
         });
         const cartPrice =
            cartRepository.createCartItem.mock.calls.at(-1)[0].price;

         expect(detail.varian[i].harga).toBe(cartPrice);
      }
   });

   it("harga per ukuran memakai rumus diskon keranjang", async () => {
      const detail = await run("detailProduk", { nama: custard.name });
      expect(detail.varian).toEqual([
         {
            ukuran: "bulat 16 cm",
            harga: applyDiscount(135000, 12.5),
            hargaSebelumDiskon: 135000,
         },
         { ukuran: "bulat 20 cm", harga: 175000, hargaSebelumDiskon: 200000 },
         { ukuran: "kotak 20 cm", harga: 218750, hargaSebelumDiskon: 250000 },
      ]);
   });

   it("harga mulai dari = varian termurah setelah diskon", async () => {
      const result = await run("cariProduk", { kataKunci: "custard" });
      expect(result.produk[0]).toMatchObject({
         nama: "Double Choco Custard Cake",
         hargaMulai: 118125,
         diskonPersen: 12.5,
      });
   });

   it("tidak menyebut harga sebelum diskon kalau tidak ada diskon", async () => {
      const detail = await run("detailProduk", { nama: nutella.name });
      expect(detail.varian[0]).toEqual({
         ukuran: "box isi 4 cupcake",
         harga: 100000,
         hargaSebelumDiskon: undefined,
      });
   });

   it("pencarian dengan sedikit hasil langsung menyertakan harga per ukuran", async () => {
      const result = await run("cariProduk", { kataKunci: "nutella" });
      expect(result.produk[0].varian.map((v) => v.harga)).toEqual([
         100000, 150000,
      ]);
   });

   it("produk yang disebut di pesan pembeli ikut membawa harganya", async () => {
      const [found] = await findMentionedProducts(
         "berapa harga double choco custard?"
      );
      expect(found.nama).toBe("Double Choco Custard Cake");
      expect(found.varian[1].harga).toBe(175000);
   });
});

describe("label ukuran", () => {
   // Pada cupcake, size berarti isi box, bukan diameter.
   it("cupcake memakai isi box, bukan cm", async () => {
      const detail = await run("detailProduk", { nama: nutella.name });
      expect(detail.varian.map((v) => v.ukuran)).toEqual([
         "box isi 4 cupcake",
         "box isi 6 cupcake",
      ]);
   });

   it("goodiebag dijual per paket dengan minimal beli", async () => {
      const detail = await run("detailProduk", { nama: goodiebag.name });
      expect(detail.varian[0].ukuran).toBe("per paket");
      expect(detail.minimalBeli).toBe("10 paket");
      expect(detail.pilihanRasa).toHaveLength(10);
   });

   it("bread memakai nama ukuran", async () => {
      const detail = await run("detailProduk", { nama: cinrolls.name });
      expect(detail.varian.map((v) => v.ukuran)).toEqual([
         "Personal Size",
         "Family Size",
      ]);
      expect(detail.pilihanFilling).toEqual(["No Filling", "Choco Chips"]);
      expect(detail.catatanHarga).toMatch(/harga tambahan/);
   });
});

describe("buildTools", () => {
   it("mencari produk berdasarkan nama tanpa membedakan huruf besar-kecil", async () => {
      const detail = await run("detailProduk", {
         nama: "  nutella cupcakes ",
      });
      expect(detail.nama).toBe("Nutella Cupcakes");
   });

   it("nama yang tidak ada dijawab sebagai data, bukan error", async () => {
      await expect(
         run("detailProduk", { nama: "Kue Karangan" })
      ).resolves.toEqual({
         error: "Produk dengan nama itu tidak ada. Salin nama persis dari hasil cariProduk.",
      });
   });

   it("tidak mengirim id produk ke model", async () => {
      const result = await run("cariProduk", {});
      expect(JSON.stringify(result)).not.toContain("prod-");
   });

   it("tamu tidak punya akses ke tool pesanan", async () => {
      const tools = buildTools({ userId: null });
      expect(tools.definitions.map((d) => d.name)).not.toContain("pesananSaya");
      await expect(tools.run("pesananSaya", {})).resolves.toEqual({
         error: "Tool pesananSaya tidak tersedia.",
      });
      expect(getOrderHistory).not.toHaveBeenCalled();
   });

   it("pesanan diambil dari pengguna yang login, bukan dari argumen model", async () => {
      getOrderHistory.mockResolvedValue([]);
      await buildTools({ userId: "user-1" }).run("pesananSaya", {
         userId: "user-lain",
      });
      expect(getOrderHistory).toHaveBeenCalledWith("user-1");
   });
});
