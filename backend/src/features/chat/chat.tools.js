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

// Hasil pencarian dibatasi supaya pencarian tanpa kata kunci tidak mengirim
// seluruh katalog ke model. Batas ini harus cukup longgar untuk satu rasa
// umum: dengan batas 10, "chocolate" (16 produk) memotong semua kue dan
// hanya menyisakan brownies & cupcake, sehingga asisten tidak pernah tahu
// kue cokelatnya ada.
const MAX_SEARCH_RESULTS = 20;
// Kalau hasil pencarian sedikit, harga per ukuran langsung disertakan.
// Pertanyaan harga yang paling umum ("berapa harga X?") jadi selesai dalam
// dua request, bukan tiga, tanpa menggembungkan hasil pencarian yang luas.
const INLINE_PRICE_LIMIT = 3;
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

// Id produk (UUID) sengaja TIDAK pernah dikirim ke model. Pengenal produk
// bagi model adalah namanya, baik untuk detailProduk maupun untuk tautan di
// jawaban (widget mencari id-nya sendiri dari nama, lihat ChatWidget.vue).
//
// Alasannya dua. Model kadang salah menyalin UUID satu karakter, dan
// tautannya berakhir di "Product tidak ditemukan". UUID juga mahal, sekitar
// 20 token per buah, dikali 20 hasil pencarian.
const summarizeProduct = (product) => ({
   nama: product.name,
   kategori: product.category,
   subkategori: product.subcategory ?? undefined,
   hargaMulai: startingPrice(product),
   diskonPersen: Number(product.discount) || undefined,
});

// Nama produk saat ini unik, tapi basis data tidak memaksakannya. Kalau
// suatu saat ada nama ganda, yang dipakai produk pertama di katalog.
const normalizeName = (name) => name.trim().toLowerCase();

const findProductByName = async (name) => {
   const target = normalizeName(name);
   const products = await getAllProducts();
   return products.find((product) => normalizeName(product.name) === target);
};

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

const variantPrices = (product) => {
   const discount = Number(product.discount) || 0;
   return product.variants.map((variant) => ({
      ukuran: variantLabel(product, variant),
      harga: applyDiscount(variant.price, discount),
      hargaSebelumDiskon: discount > 0 ? Number(variant.price) : undefined,
   }));
};

const detailProduct = (product) => {
   const hasCombo =
      Array.isArray(product.comboPrices) && product.comboPrices.length > 0;

   return {
      nama: product.name,
      kategori: product.category,
      subkategori: product.subcategory ?? undefined,
      deskripsi: product.description.slice(0, MAX_DESCRIPTION_LENGTH),
      ...flavorOptions(product),
      varian: variantPrices(product),
      pilihanFilling: optionNames(product.filling),
      pilihanTopping: optionNames(product.topping),
      catatanHarga: hasCombo
         ? "Ada harga tambahan tergantung kombinasi filling & topping; totalnya tampil di halaman produk."
         : undefined,
      minimalBeli: isGoodiebagCupcake(product.category)
         ? `${goodiebagMinQty(product.category)} paket`
         : undefined,
   };
};

// Nama produk berbahasa Inggris, deskripsinya berbahasa Indonesia, dan
// pembeli menulis dengan ejaan apa saja. Tanpa ini "coklat" tidak menemukan
// apa pun karena data memakai "cokelat".
const SYNONYM_GROUPS = [
   ["chocolate", "choco", "cokelat", "coklat"],
   ["cheese", "keju"],
   ["strawberry", "stroberi"],
   ["vanilla", "vanila"],
   ["coffee", "kopi"],
   ["bread", "roti"],
];

const synonymsOf = (word) =>
   SYNONYM_GROUPS.find((group) => group.includes(word)) ?? [word];

// Kata kunci dari model diperlakukan seperti pesan pembeli: kata umum
// ("kue", "cakes") dibuang dan bentuk jamak dinormalkan. Kalau tidak,
// "kue cokelat" tidak menemukan apa pun karena tidak ada produk yang memuat
// kata "kue". Kalau semua katanya umum (mis. "cupcake"), kata aslinya tetap
// dipakai supaya pencarian tidak berubah jadi seluruh katalog.
const searchWords = (keyword) => {
   const original = keyword.toLowerCase().split(/\s+/).filter(Boolean);
   const significant = [...significantWords(keyword)];
   return significant.length > 0 ? significant : original;
};

// Seberapa kuat produk cocok dengan kata kunci, dari yang terkuat. Hasil
// diurutkan menurut ini sebelum dipotong MAX_SEARCH_RESULTS, supaya yang
// terbuang adalah yang paling lemah. Tanpa urutan, "chocolate" memotong
// Choco Mocha Custard Cake tapi menyisakan kue custom yang hanya
// kebetulan menawarkan pilihan rasa cokelat.
const MATCH_IN_NAME = 0; // nama atau rasa tetap
const MATCH_IN_TEXT = 1; // kategori atau deskripsi
const MATCH_IN_CHOICES = 2; // hanya pilihan rasa yang bisa dipilih pembeli

const joinLower = (values) => values.filter(Boolean).join(" ").toLowerCase();

// Katalog cukup kecil untuk disaring di memori. Dengan begitu pencarian
// memakai daftar produk yang sudah di-cache (getAllProducts), bukan query
// baru ke basis data untuk setiap kata kunci yang dicoba model.
//
// Pilihan rasa ikut dicari. Kue custom dan petite cake tidak menyimpan
// rasa di kolom `flavor` karena rasanya dipilih pembeli, padahal pembeli
// yang mencari "cokelat" juga perlu tahu kue itu bisa dipesan rasa cokelat.
//
// Mengembalikan null kalau tidak cocok. Untuk beberapa kata, yang dipakai
// kecocokan terlemah di antara kata-katanya.
const matchStrength = (product, words) => {
   const levels = [
      joinLower([product.name, product.flavor]),
      joinLower([product.category, product.subcategory, product.description]),
      joinLower(flavorOptions(product).pilihanRasa ?? []),
   ];

   let weakest = MATCH_IN_NAME;
   for (const word of words) {
      const synonyms = synonymsOf(word);
      const level = levels.findIndex((text) =>
         synonyms.some((synonym) => text.includes(synonym))
      );
      if (level === -1) return null;
      weakest = Math.max(weakest, level);
   }
   return weakest;
};

const searchCatalog = async ({ kataKunci, kategori }) => {
   const products = await getAllProducts();
   const words = searchWords(kataKunci ?? "");
   const category = kategori?.toLowerCase();

   // sort() di Node stabil, jadi urutan asli katalog tetap terjaga di dalam
   // tingkat kecocokan yang sama.
   const byKeyword = products
      .map((product) => ({ product, strength: matchStrength(product, words) }))
      .filter(({ strength }) => strength !== null)
      .sort((a, b) => a.strength - b.strength);
   const byBoth = category
      ? byKeyword.filter(({ product }) =>
           product.category?.toLowerCase().includes(category)
        )
      : byKeyword;

   // Model kadang menebak kategori yang keliru (mis. "Custom" untuk kue
   // Signature). Kalau kategori itulah yang membuat hasilnya kosong, abaikan
   // kategorinya. Menjawab "produk tidak ada" untuk produk yang dijual jauh
   // lebih merugikan daripada hasil yang sedikit lebih luas.
   // Tanpa kata kunci, byKeyword berisi seluruh katalog; mengabaikan kategori
   // di sini berarti menjawab "Cheese Cake" dengan semua produk toko.
   const matches = byBoth.length > 0 || words.length === 0 ? byBoth : byKeyword;

   // Katalog di prompt memuat semua pilihan yang dikenal, termasuk kategori
   // yang sedang kosong (mis. Basque). Tanpa jawaban tegas, model terus
   // mencoba kata kunci lain sampai jatah langkahnya habis. Kata kunci
   // panjang masih diberi satu kesempatan, karena bisa gagal hanya karena
   // penulisan ("cheesecake" vs "cheese cake").
   if (matches.length === 0) {
      return {
         jumlahDitemukan: 0,
         catatan:
            words.length > 1
               ? "Tidak ada yang cocok. Coba sekali lagi dengan satu kata terpenting dari nama produk."
               : "Produk ini sedang tidak dijual. Jangan mencari ulang; sampaikan ke pembeli, tawarkan kategori yang tersedia, atau arahkan ke WhatsApp untuk pesanan khusus.",
         kategoriTersedia: [...new Set(products.map((p) => p.category))],
      };
   }

   const withPrices = matches.length <= INLINE_PRICE_LIMIT;
   const hidden = matches.slice(MAX_SEARCH_RESULTS);

   return {
      jumlahDitemukan: matches.length,
      // Tanpa catatan ini model menganggap daftar yang terpotong sudah
      // lengkap, dan menjawab seolah produk lain tidak ada.
      catatan:
         hidden.length > 0
            ? `${hidden.length} produk lain tidak ditampilkan, dari kategori: ${[...new Set(hidden.map(({ product }) => product.category))].join(", ")}. Cari lagi dengan kategori itu kalau pembeli membutuhkannya.`
            : undefined,
      produk: matches
         .slice(0, MAX_SEARCH_RESULTS)
         .map(({ product, strength }) => ({
            ...summarizeProduct(product),
            // Supaya asisten bilang "bisa dipesan rasa cokelat", bukan
            // menyebut kue custom itu sebagai kue cokelat.
            hanyaPilihanRasa: strength === MATCH_IN_CHOICES || undefined,
            varian: withPrices ? variantPrices(product) : undefined,
         })),
   };
};

// Kata yang muncul di banyak nama produk, sehingga tidak membedakan satu
// produk dari yang lain.
const GENERIC_NAME_WORDS = new Set([
   "cake",
   "cakes",
   "cupcake",
   "cupcakes",
   "series",
   "with",
   "the",
   "and",
   "kue",
]);
const MIN_WORD_LENGTH = 3;
const MAX_MENTIONED_PRODUCTS = 3;

const significantWords = (text) =>
   new Set(
      text
         .toLowerCase()
         .replace(/[^\p{L}\p{N}\s]/gu, " ")
         .split(/\s+/)
         .filter(
            (word) =>
               word.length >= MIN_WORD_LENGTH && !GENERIC_NAME_WORDS.has(word)
         )
         // Pembeli jarang menulis bentuk jamak persis seperti nama produk
         // ("cinnamon roll" untuk "Cinnamon Rolls").
         .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
   );

/**
 * Produk yang namanya disebut di pesan pembeli, dicari server sebelum
 * pesan dikirim ke model.
 *
 * Model kadang menjawab "produknya tidak ada" tanpa memanggil cariProduk.
 * Memaksanya lewat tool_choice tidak bisa diandalkan di Groq: model tetap
 * boleh menulis teks, lalu request dibatalkan dan kuotanya tetap terpakai.
 * Menyodorkan datanya lebih dulu tidak butuh request tambahan sama sekali.
 *
 * Sebuah produk dianggap disebut kalau minimal dua kata khas namanya ada di
 * pesan, atau semua kata khasnya ada (untuk nama pendek). Yang diambil hanya
 * yang paling banyak cocok, supaya "choco mocha" tidak ikut menyeret semua
 * produk "choco". Pesan umum seperti "brownies" sengaja tidak menghasilkan
 * apa-apa; untuk itu model tetap memakai cariProduk.
 */
export const findMentionedProducts = async (text) => {
   const messageWords = significantWords(text);
   if (messageWords.size === 0) return [];

   const products = await getAllProducts();
   const scored = products
      .map((product) => {
         const nameWords = [...significantWords(product.name)];
         const hits = nameWords.filter((word) => messageWords.has(word));
         const matched =
            hits.length >= 2 ||
            (hits.length > 0 && hits.length === nameWords.length);
         return { product, score: matched ? hits.length : 0 };
      })
      .filter(({ score }) => score > 0);

   const best = Math.max(0, ...scored.map(({ score }) => score));

   return scored
      .filter(({ score }) => score === best)
      .slice(0, MAX_MENTIONED_PRODUCTS)
      .map(({ product }) => ({
         ...summarizeProduct(product),
         varian: variantPrices(product),
      }));
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
         "Mencari produk yang sedang dijual beserta harga mulai-darinya. Kalau hasilnya 3 produk atau kurang, harga per ukuran sudah disertakan di `varian`, jadi tidak perlu detailProduk untuk menjawab harga. Panggil setiap kali pembeli menanyakan produk, harga, atau ketersediaan. Kosongkan kedua parameter untuk melihat semua produk. Hasil diurutkan dari yang paling cocok. Produk bertanda `hanyaPilihanRasa` tidak memiliki rasa itu secara tetap; pembeli bisa memilih rasa itu saat memesan. Kalau ada `catatan` di hasilnya, ikuti.",
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
         "Pilihan rasa, filling, topping, minimal beli, dan harga per ukuran satu produk. Pakai `nama` persis dari hasil cariProduk.",
      parameters: {
         type: "object",
         properties: {
            nama: {
               type: "string",
               description:
                  "Nama produk persis seperti kolom `nama` di cariProduk",
            },
         },
         required: ["nama"],
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
      detailProduk: async ({ nama }) => {
         // Argumen disusun model, bukan divalidasi Zod, jadi bisa kosong
         // atau berupa nama karangan.
         const found =
            typeof nama === "string" && nama.trim() !== ""
               ? await findProductByName(nama)
               : undefined;
         if (!found) {
            return {
               error: "Produk dengan nama itu tidak ada. Salin nama persis dari hasil cariProduk.",
            };
         }
         // Katalog yang di-cache belum tentu memuat semua kolom detail
         return detailProduct(await getProductById(found.id));
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
