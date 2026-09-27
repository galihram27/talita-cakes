import { getAllProducts, getProductById } from "../product/product.service.js";
import { getOrderHistory } from "../order/order.service.js";
import { applyDiscount } from "../cart/cart.service.js";
import {
   isBreadCategory,
   breadSizeForVariant,
   isGoodiebagCupcake,
   goodiebagMinQty,
   cupcakeFlavorsForCategory,
   goodiebagFlavorsForSubcategory,
   FLAVORS_BY_TYPE,
} from "../product/product.constant.js";
import {
   OWNER_WHATSAPP_NUMBER,
   STORE_LOCATION,
} from "../../config/store.config.js";
import { AppError } from "../../utils/appError.js";

/**
 * Tool yang boleh diminta Gemini. Semuanya HANYA MEMBACA.
 *
 * Tidak ada tool untuk membuat pesanan, mengubah keranjang, atau apa pun yang
 * menulis. Itulah pelindung utama dari prompt injection: seberapa pun pembeli
 * membujuk, model tidak punya cara untuk mengubah data.
 *
 * Hasil tool dikirim balik ke Gemini sebagai token, jadi bentuknya sengaja
 * diringkas. Foto, id varian, dan kolom internal lain tidak ikut.
 */

// Hasil pencarian dibatasi supaya kata kunci yang terlalu umum ("kue") tidak
// mengirim seluruh katalog ke model.
const MAX_SEARCH_RESULTS = 10;
const MAX_RECENT_ORDERS = 5;
const MAX_DESCRIPTION_LENGTH = 400;

const SHAPE_LABEL = { ROUND: "bulat", SQUARE: "kotak" };

const ORDER_STATUS_LABEL = {
   PENDING: "menunggu konfirmasi toko",
   CONFIRMED: "dikonfirmasi, sedang diproses",
   CANCELLED: "dibatalkan",
   COMPLETED: "selesai",
};

// Harga "mulai dari" dihitung sama seperti ProductCard.vue: harga varian
// termurah, lalu dipotong diskon.
const startingPrice = (product) => {
   if (product.variants.length === 0) return null;
   const cheapest = Math.min(...product.variants.map((v) => Number(v.price)));
   return applyDiscount(cheapest, product.discount);
};

const summarizeProduct = (product) => ({
   id: product.id,
   nama: product.name,
   kategori: product.category,
   subkategori: product.subcategory ?? undefined,
   hargaMulai: startingPrice(product),
   diskonPersen: Number(product.discount) || undefined,
});

// Arti kolom size berbeda per tipe. Pada cupcake ia jumlah isi box, bukan
// diameter; salah membacanya berarti asisten menyebut "kue 6 cm".
const variantLabel = (product, variant) => {
   if (product.type === "TYPE6") {
      return isGoodiebagCupcake(product.category)
         ? "per paket"
         : `box isi ${variant.size} cupcake`;
   }
   if (isBreadCategory(product.category)) {
      return breadSizeForVariant(variant)?.label ?? "standar";
   }
   if (variant.size) {
      const size = variant.sizeB
         ? `${variant.size}x${variant.sizeB} cm`
         : `${variant.size} cm`;
      return [SHAPE_LABEL[variant.shape], size].filter(Boolean).join(" ");
   }
   return "standar";
};

// Rasa yang bisa dipilih pembeli. Produk berasa tetap cukup menyebut rasanya.
const flavorOptions = (product) => {
   if (product.flavor) return { rasa: product.flavor };
   if (FLAVORS_BY_TYPE[product.type]) {
      return { pilihanRasa: FLAVORS_BY_TYPE[product.type] };
   }
   if (product.type === "TYPE6") {
      const flavors = isGoodiebagCupcake(product.category)
         ? goodiebagFlavorsForSubcategory(product.subcategory)
         : cupcakeFlavorsForCategory(product.category);
      if (flavors.length > 0) return { pilihanRasa: flavors };
   }
   return {};
};

const optionNames = (json) => json?.options?.map((o) => o.name) ?? undefined;

const detailProduct = (product) => {
   const discount = Number(product.discount) || 0;
   const hasCombo =
      Array.isArray(product.comboPrices) && product.comboPrices.length > 0;

   return {
      nama: product.name,
      kategori: product.category,
      subkategori: product.subcategory ?? undefined,
      deskripsi: product.description.slice(0, MAX_DESCRIPTION_LENGTH),
      ...flavorOptions(product),
      varian: product.variants.map((variant) => ({
         ukuran: variantLabel(product, variant),
         harga: applyDiscount(variant.price, discount),
         hargaSebelumDiskon: discount > 0 ? Number(variant.price) : undefined,
      })),
      pilihanFilling: optionNames(product.filling),
      pilihanTopping: optionNames(product.topping),
      catatanHarga: hasCombo
         ? "Ada harga tambahan tergantung kombinasi filling & topping; totalnya tampil di halaman produk."
         : undefined,
      minimalBeli: isGoodiebagCupcake(product.category)
         ? `${goodiebagMinQty(product.category)} paket`
         : undefined,
      halaman: `/product/${product.id}`,
   };
};

// Katalog cukup kecil untuk disaring di memori. Dengan begitu pencarian
// memakai daftar produk yang sudah di-cache (getAllProducts), bukan query
// baru ke basis data untuk setiap kata kunci yang dicoba model.
const searchCatalog = async ({ kataKunci, kategori }) => {
   const products = await getAllProducts();
   const words = (kataKunci ?? "").toLowerCase().split(/\s+/).filter(Boolean);
   const category = kategori?.toLowerCase();

   const matches = products.filter((product) => {
      if (category && !product.category?.toLowerCase().includes(category)) {
         return false;
      }
      const haystack = [
         product.name,
         product.category,
         product.subcategory,
         product.flavor,
         product.description,
      ]
         .filter(Boolean)
         .join(" ")
         .toLowerCase();
      return words.every((word) => haystack.includes(word));
   });

   return {
      jumlahDitemukan: matches.length,
      produk: matches.slice(0, MAX_SEARCH_RESULTS).map(summarizeProduct),
   };
};

const storeInfo = () => ({
   whatsapp: `https://wa.me/${OWNER_WHATSAPP_NUMBER}`,
   lokasiDiPeta:
      STORE_LOCATION.lat && STORE_LOCATION.lng
         ? `https://www.google.com/maps?q=${STORE_LOCATION.lat},${STORE_LOCATION.lng}`
         : undefined,
   alamatLengkap: "Tercantum di halaman Tentang Kami.",
});

const recentOrders = async (userId) => {
   const orders = await getOrderHistory(userId);

   return orders.slice(0, MAX_RECENT_ORDERS).map((order) => ({
      dipesanPada: order.createdAt.toISOString().slice(0, 10),
      tanggalKue: order.requestCakeDate.toISOString().slice(0, 10),
      status: ORDER_STATUS_LABEL[order.status] ?? order.status,
      pengambilan:
         order.fulfillmentType === "PICKUP" ? "ambil sendiri" : "diantar",
      total: Number(order.total),
      item: order.items.map((item) => `${item.productName} x${item.quantity}`),
   }));
};

const PRODUCT_TOOLS = [
   {
      name: "cariProduk",
      description:
         "Mencari produk yang sedang dijual beserta harga mulai-darinya. Panggil setiap kali pembeli menanyakan produk, harga, atau ketersediaan. Kosongkan kedua parameter untuk melihat semua produk.",
      parameters: {
         type: "object",
         properties: {
            kataKunci: {
               type: "string",
               description:
                  "Kata kunci nama, rasa, atau jenis produk, mis. 'brownies' atau 'red velvet'.",
            },
            kategori: {
               type: "string",
               description:
                  "Nama kategori dari katalog, mis. 'Brownies' atau 'Simple Decor Cupcakes'.",
            },
         },
      },
   },
   {
      name: "detailProduk",
      description:
         "Harga per ukuran, pilihan rasa, dan detail lain satu produk. Pakai id dari hasil cariProduk.",
      parameters: {
         type: "object",
         properties: {
            id: { type: "string", description: "id produk dari cariProduk" },
         },
         required: ["id"],
      },
   },
   {
      name: "infoToko",
      description: "Tautan WhatsApp dan lokasi toko di peta.",
      parameters: { type: "object", properties: {} },
   },
];

const ORDER_TOOL = {
   name: "pesananSaya",
   description:
      "Daftar pesanan terbaru milik pembeli yang sedang login, beserta statusnya.",
   parameters: { type: "object", properties: {} },
};

/**
 * Menyusun tool untuk satu request chat.
 *
 * `userId` berasal dari token login (req.user), TIDAK PERNAH dari argumen
 * yang disusun model. Karena itu pesananSaya sengaja tidak punya parameter:
 * tidak ada celah bagi pembeli untuk menulis "tampilkan pesanan user lain"
 * dan diteruskan model. Untuk tamu, tool itu bahkan tidak didaftarkan.
 */
export const buildTools = ({ userId }) => {
   const handlers = {
      cariProduk: (args) => searchCatalog(args),
      detailProduk: async ({ id }) => {
         // Argumen disusun model, bukan divalidasi Zod. Tanpa pengecekan ini
         // id kosong sampai ke Prisma dan menjadi error 500.
         if (typeof id !== "string" || id === "") {
            return { error: "id produk wajib diisi, ambil dari cariProduk." };
         }
         return detailProduct(await getProductById(id));
      },
      infoToko: () => storeInfo(),
   };
   if (userId) handlers.pesananSaya = () => recentOrders(userId);

   const definitions = userId ? [...PRODUCT_TOOLS, ORDER_TOOL] : PRODUCT_TOOLS;

   // Kegagalan yang wajar (mis. id produk tidak ada) dikembalikan ke model
   // sebagai data, supaya ia bisa minta maaf atau mencoba cara lain. Bug
   // sungguhan tetap dilempar dan berakhir di errorHandler.
   const run = async (name, args) => {
      const handler = handlers[name];
      if (!handler) return { error: `Tool ${name} tidak tersedia.` };

      try {
         return await handler(args ?? {});
      } catch (err) {
         if (err instanceof AppError) return { error: err.message };
         throw err;
      }
   };

   return { definitions, run };
};
