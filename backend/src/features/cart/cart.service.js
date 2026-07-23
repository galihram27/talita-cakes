// src/features/cart/cart.service.js
import { AppError } from "../../utils/appError.js";
import * as cartRepository from "./cart.repository.js";
import * as productRepository from "../../features/product/product.repository.js";
import {
   FLAVORS_BY_TYPE,
   cupcakeFlavorsForCategory,
   isFixedFlavorCupcake,
   isGoodiebagCupcake,
   goodiebagMinQty,
   isMultiFlavorCupcake,
   goodiebagFlavorsForSubcategory,
   goodiebagFlavorLimit,
   isType5SizeSubcategory,
   usesFilling,
   usesTopping,
   MAX_TOPPING_SELECT,
   isBreadCategory,
} from "../../features/product/product.constant.js";

const PRODUCT_TYPE = {
   TYPE1: "TYPE1",
   TYPE2: "TYPE2",
   TYPE3: "TYPE3",
   TYPE4: "TYPE4",
   TYPE5: "TYPE5",
   TYPE6: "TYPE6",
};

/**
 * Hitung harga final per-unit setelah discount.
 * discount disimpan dalam Decimal(5,2) -> diasumsikan dalam PERSEN (0-100).
 * Kalau ternyata discount dimaksud nominal rupiah, ubah logic ini.
 */
const applyDiscount = (basePrice, discountPercent) => {
   const price = Number(basePrice);
   const discount = Number(discountPercent ?? 0);
   const finalPrice = price - (price * discount) / 100;
   return Math.round(finalPrice * 100) / 100; // 2 desimal
};

/**
 * Resolve pilihan FILLING user (CINROLLS VAN DEPOK). Pilih SATU, tanpa harga
 * (harga ada di kombinasi). Mengembalikan { fillingLabel }. Kalau user tidak
 * memilih, otomatis memakai opsi default (mis. "Tanpa Filling").
 */
const resolveFilling = (product, payload) => {
   const config = product.filling;
   if (
      !usesFilling(product.subcategory) ||
      !config ||
      !Array.isArray(config.options) ||
      config.options.length === 0
   ) {
      return { fillingLabel: null };
   }

   const { options } = config;
   const validNames = new Set(options.map((o) => o.name));
   const defaultIndex =
      Number.isInteger(config.defaultIndex) &&
      config.defaultIndex >= 0 &&
      config.defaultIndex < options.length
         ? config.defaultIndex
         : 0;

   const selected =
      typeof payload.filling === "string" && payload.filling.trim() !== ""
         ? payload.filling
         : options[defaultIndex].name;

   if (!validNames.has(selected)) {
      throw new AppError(`Filling tidak valid: ${selected}`, 422);
   }
   return { fillingLabel: selected };
};

/**
 * Resolve pilihan TOPPING user (CINROLLS VAN DEPOK). WAJIB pilih min 1, boleh
 * beberapa (maks sesuai config, plafon MAX_TOPPING_SELECT). TANPA harga sendiri.
 * Mengembalikan { toppingLabel, toppingNames }.
 */
const resolveTopping = (product, payload) => {
   const config = product.topping;
   if (
      !usesTopping(product.subcategory) ||
      !config ||
      !Array.isArray(config.options) ||
      config.options.length === 0
   ) {
      return { toppingLabel: null, toppingNames: [] };
   }

   const { options } = config;
   const validNames = new Set(options.map((o) => o.name));
   const maxSelect = Math.min(config.maxSelect ?? 1, MAX_TOPPING_SELECT);

   const selected = Array.isArray(payload.toppings)
      ? [...new Set(payload.toppings.filter((n) => typeof n === "string"))]
      : [];

   if (selected.length === 0) {
      throw new AppError("Wajib memilih minimal satu topping", 422);
   }
   const invalid = selected.filter((n) => !validNames.has(n));
   if (invalid.length > 0) {
      throw new AppError(`Topping tidak valid: ${invalid.join(", ")}`, 422);
   }
   if (selected.length > maxSelect) {
      throw new AppError(`Maksimal memilih ${maxSelect} topping`, 422);
   }

   // urutkan sesuai config supaya label konsisten
   const ordered = options
      .map((o) => o.name)
      .filter((n) => selected.includes(n));
   return { toppingLabel: ordered.join(", "), toppingNames: ordered };
};

/**
 * Total harga TAMBAHAN dari kombinasi: untuk filling terpilih + tiap topping
 * terpilih, jumlahkan harga baris kombinasi yang cocok (yang tak terdaftar = 0).
 */
const comboPriceFor = (product, fillingName, toppingNames) => {
   const combos = product.comboPrices;
   if (!Array.isArray(combos) || combos.length === 0 || !fillingName) return 0;
   return toppingNames.reduce((sum, top) => {
      const row = combos.find((c) => c.filling === fillingName && c.topping === top);
      return sum + (row ? Number(row.price) || 0 : 0);
   }, 0);
};

/**
 * Validasi & resolve variant + price berdasarkan ProductType.
 * Mengembalikan { variantId, flavor, price } yang sudah final,
 * supaya controller/repository tidak perlu tahu logic bisnis ini.
 */
const resolveItemDetails = async (product, payload) => {
   const { type, discount } = product;

   // flavor pilihan user wajib untuk TYPE2 & TYPE4; daftar rasa yang valid
   // berbeda per tipe (lihat FLAVORS_BY_TYPE).
   const validateCustomFlavor = (flavor, productType) => {
      const allowed = FLAVORS_BY_TYPE[productType] ?? [];
      if (!flavor) {
         throw new AppError("flavor wajib diisi untuk tipe produk ini", 422);
      }
      if (!allowed.includes(flavor)) {
         throw new AppError(
            `flavor tidak valid, pilih salah satu: ${allowed.join(", ")}`,
            422
         );
      }
   };

   // TYPE 5 sub-kategori size-pilihan (Basque): user memilih size (variant).
   if (
      type === PRODUCT_TYPE.TYPE5 &&
      isType5SizeSubcategory(product.subcategory)
   ) {
      if (!payload.variantId) {
         throw new AppError("variantId (ukuran) wajib dipilih", 422);
      }
      const variant = await productRepository.findVariantById(payload.variantId);
      if (!variant || variant.productId !== product.id) {
         throw new AppError("Ukuran tidak ditemukan untuk produk ini", 404);
      }
      return {
         variantId: variant.id,
         flavor: null,
         customImage: null,
         price: applyDiscount(variant.price, discount),
      };
   }

   // TYPE 1, TYPE 2 & TYPE 5: satu varian.
   // Bread (TYPE5): user memilih UKURAN (variant) -> variantId wajib.
   // TYPE5 lain: varian fixed (1 row).
   if (
      type === PRODUCT_TYPE.TYPE1 ||
      type === PRODUCT_TYPE.TYPE2 ||
      type === PRODUCT_TYPE.TYPE5
   ) {
      const isBread =
         type === PRODUCT_TYPE.TYPE5 && isBreadCategory(product.category);

      let variant;
      if (isBread) {
         if (!payload.variantId) {
            throw new AppError("variantId (ukuran) wajib dipilih", 422);
         }
         variant = await productRepository.findVariantById(payload.variantId);
         if (!variant || variant.productId !== product.id) {
            throw new AppError("Ukuran tidak ditemukan untuk produk ini", 404);
         }
      } else {
         variant = await productRepository.findSingleVariantByProductId(
            product.id
         );
         if (!variant) {
            throw new AppError("Variant untuk produk ini belum tersedia", 422);
         }
      }

      // TYPE 2: user pilih flavor + dekorasi (custom image)
      if (type === PRODUCT_TYPE.TYPE2) {
         validateCustomFlavor(payload.flavor, PRODUCT_TYPE.TYPE2);
      }

      // TYPE 5 CINROLLS VAN DEPOK: user memilih 1 filling + beberapa topping.
      // Harga = harga dasar + Σ harga kombinasi (filling × tiap topping).
      const { fillingLabel } =
         type === PRODUCT_TYPE.TYPE5
            ? resolveFilling(product, payload)
            : { fillingLabel: null };
      const { toppingLabel, toppingNames } =
         type === PRODUCT_TYPE.TYPE5
            ? resolveTopping(product, payload)
            : { toppingLabel: null, toppingNames: [] };
      const comboAdd =
         type === PRODUCT_TYPE.TYPE5
            ? comboPriceFor(product, fillingLabel, toppingNames)
            : 0;

      return {
         // Bread menyimpan variantId agar keranjang menampilkan ukuran terpilih;
         // TYPE1/2/5 lain tidak menyimpan variant (varian tunggal).
         variantId: isBread ? variant.id : null,
         flavor: type === PRODUCT_TYPE.TYPE2 ? payload.flavor : null,
         filling: fillingLabel,
         topping: toppingLabel,
         customImage: type === PRODUCT_TYPE.TYPE2 ? payload.customImage : null,
         price: applyDiscount(variant.price, discount) + comboAdd,
      };
   }

   // TYPE 3 & TYPE 4: user memilih shape + size lewat variant
   if (type === PRODUCT_TYPE.TYPE3 || type === PRODUCT_TYPE.TYPE4) {
      if (!payload.variantId) {
         throw new AppError("variantId wajib diisi untuk tipe produk ini", 422);
      }

      const variant = await productRepository.findVariantById(
         payload.variantId
      );
      if (!variant || variant.productId !== product.id) {
         throw new AppError("Variant tidak ditemukan untuk produk ini", 404);
      }

      // TYPE 4: user juga pilih flavor + dekorasi (custom image)
      if (type === PRODUCT_TYPE.TYPE4) {
         validateCustomFlavor(payload.flavor, PRODUCT_TYPE.TYPE4);
      }

      return {
         variantId: variant.id,
         flavor: type === PRODUCT_TYPE.TYPE4 ? payload.flavor : null,
         customImage: type === PRODUCT_TYPE.TYPE4 ? payload.customImage : null,
         price: applyDiscount(variant.price, discount),
      };
   }

   // TYPE 6 (cupcakes): user WAJIB memilih isi box (variant). Rasa & dekorasi
   // tergantung kategori — American Butter sudah fix dari admin, kategori lain
   // user memilih rasa (daftarnya beda per kategori) + unggah referensi dekor.
   if (type === PRODUCT_TYPE.TYPE6) {
      if (!payload.variantId) {
         throw new AppError("variantId (isi box) wajib dipilih", 422);
      }

      const variant = await productRepository.findVariantById(payload.variantId);
      if (!variant || variant.productId !== product.id) {
         throw new AppError("Isi box tidak ditemukan untuk produk ini", 404);
      }

      // Goodiebag: user memilih beberapa rasa (1-4) dari daftar rasa milik
      // sub-kategori produk. Disimpan tergabung di kolom flavor. Dekorasi
      // ditentukan admin (tidak menyimpan custom image).
      if (isMultiFlavorCupcake(product.category)) {
         const allowed = goodiebagFlavorsForSubcategory(product.subcategory);
         const { min, max } = goodiebagFlavorLimit(product.subcategory);
         const flavors = Array.isArray(payload.flavors) ? payload.flavors : [];
         const unique = [...new Set(flavors)];

         if (unique.length !== flavors.length) {
            throw new AppError("Terdapat rasa yang terpilih ganda", 422);
         }
         if (flavors.length < min || flavors.length > max) {
            throw new AppError(
               `Pilih ${min} sampai ${max} rasa untuk goodiebag`,
               422
            );
         }
         const invalid = flavors.filter((f) => !allowed.includes(f));
         if (invalid.length > 0) {
            throw new AppError(
               `Rasa tidak valid: ${invalid.join(", ")}`,
               422
            );
         }

         return {
            variantId: variant.id,
            flavor: flavors.join(", "),
            customImage: null,
            price: applyDiscount(variant.price, discount),
         };
      }

      const fixedFlavor = isFixedFlavorCupcake(product.category);

      if (!fixedFlavor) {
         const allowed = cupcakeFlavorsForCategory(product.category);
         if (!payload.flavor) {
            throw new AppError("flavor wajib diisi untuk cupcake ini", 422);
         }
         if (!allowed.includes(payload.flavor)) {
            throw new AppError(
               `flavor tidak valid, pilih salah satu: ${allowed.join(", ")}`,
               422
            );
         }
      }

      return {
         variantId: variant.id,
         // kategori ber-rasa-fix tidak menyimpan pilihan user; rasanya ada di produk
         flavor: fixedFlavor ? null : payload.flavor,
         customImage: fixedFlavor ? null : payload.customImage,
         price: applyDiscount(variant.price, discount),
      };
   }

   throw new AppError("Tipe produk tidak dikenali", 422);
};

/**
 * Tambah item ke cart. Kalau item identik (productId + variantId + flavor)
 * sudah ada, quantity di-increment, bukan bikin baris baru.
 */
export const addItemToCart = async (userId, payload) => {
   const { productId, quantity, textOnCake, notes } = payload;

   if (!quantity || quantity < 1) {
      throw new AppError("quantity minimal 1", 422);
   }

   const product = await productRepository.findProductById(productId);
   if (!product) {
      throw new AppError("Produk tidak ditemukan", 404);
   }

   // Goodiebag (TYPE6): pembelian minimal sejumlah box tertentu.
   if (isGoodiebagCupcake(product.category)) {
      const minQty = goodiebagMinQty(product.category);
      if (quantity < minQty) {
         throw new AppError(`Minimal pembelian ${minQty} box`, 422);
      }
   }

   const { variantId, flavor, filling, topping, customImage, price } =
      await resolveItemDetails(product, payload);

   const cart = await cartRepository.findOrCreateCart(userId);

   const existingItem = await cartRepository.findMatchingCartItem({
      cartId: cart.id,
      productId,
      variantId,
      flavor,
      // filling/topping berbeda = baris terpisah (harga & pilihannya beda)
      filling,
      topping,
   });

   if (existingItem) {
      return cartRepository.incrementCartItemQuantity(
         existingItem.id,
         quantity
      );
   }

   return cartRepository.createCartItem({
      cartId: cart.id,
      productId,
      variantId,
      flavor,
      filling,
      topping,
      customImage,
      textOnCake,
      notes,
      quantity,
      price,
   });
};

/**
 * Ambil isi cart user + hitung quantity x price per item, dan subtotal total.
 * Kalau user belum punya cart sama sekali, kembalikan struktur kosong
 * (tidak perlu create cart kosong di DB hanya untuk "lihat" cart).
 */
export const getCartByUserId = async (userId) => {
   const cart = await cartRepository.findCartWithItemsByUserId(userId);

   if (!cart) {
      return { id: null, items: [], subtotal: 0 };
   }

   let subtotal = 0;

   const items = cart.items.map((item) => {
      const lineTotal = Number(item.price) * item.quantity;
      subtotal += lineTotal;

      return {
         id: item.id,
         productId: item.productId,
         productName: item.product.name,
         productImage: item.product.image,
         // dipakai frontend untuk melabeli varian: TYPE6 memakai `size` sebagai
         // isi box (pcs), bukan diameter cake dalam cm.
         productType: item.product.type,
         productCategory: item.product.category,
         variantId: item.variantId,
         shape: item.variant?.shape ?? null,
         size: item.variant?.size ?? null,
         sizeB: item.variant?.sizeB ?? null,
         flavor: item.flavor,
         filling: item.filling,
         topping: item.topping,
         customImage: item.customImage,
         textOnCake: item.textOnCake,
         notes: item.notes,
         quantity: item.quantity,
         price: Number(item.price),
         lineTotal,
      };
   });

   return {
      id: cart.id,
      items,
      subtotal,
   };
};

export const updateItemQuantity = async (userId, itemId, quantity) => {
   const item = await cartRepository.findCartItemById(itemId);
   if (!item || item.cart.userId !== userId) {
      throw new AppError("Item keranjang tidak ditemukan", 404);
   }

   if (quantity === 0) {
      await cartRepository.deleteCartItem(itemId);
      return null; // item sudah dihapus, tidak ada data untuk dikembalikan
   }

   // Goodiebag: tidak boleh turun di bawah minimal box (kecuali 0 = hapus).
   if (isGoodiebagCupcake(item.product?.category)) {
      const minQty = goodiebagMinQty(item.product.category);
      if (quantity < minQty) {
         throw new AppError(`Minimal pembelian ${minQty} box`, 422);
      }
   }

   return cartRepository.updateCartItemQuantity(itemId, quantity);
};

export const removeItem = async (userId, itemId) => {
   const item = await cartRepository.findCartItemById(itemId);
   if (!item || item.cart.userId !== userId) {
      throw new AppError("Item keranjang tidak ditemukan", 404);
   }

   return cartRepository.deleteCartItem(itemId);
};

export const clearCart = async (userId) => {
   const cart = await cartRepository.findCartByUserId(userId);
   if (!cart) return;

   return cartRepository.deleteAllCartItems(cart.id);
};
