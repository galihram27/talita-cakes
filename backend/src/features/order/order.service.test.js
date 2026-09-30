import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
   previewCheckout,
   confirmCheckout,
   getOrderById,
   getAllOrdersForAdmin,
   updateOrderStatusByAdmin,
} from "./order.service.js";
import * as orderRepository from "./order.repository.js";
import * as cartRepository from "../cart/cart.repository.js";
import { getDeliveryDistanceKm } from "../../utils/distance.js";

vi.mock("./order.repository.js");
vi.mock("../cart/cart.repository.js");
// Jarak ditentukan sendiri oleh test, tanpa memanggil HERE.
vi.mock("../../utils/distance.js");
// Koordinat & nomor toko biasanya dibaca dari .env; test tidak boleh
// bergantung padanya.
vi.mock("../../config/store.config.js", () => ({
   STORE_LOCATION: { lat: -6.4025, lng: 106.7942 },
   OWNER_WHATSAPP_NUMBER: "6281200000000",
}));

const USER = "user-1";

// Hari ini dibuat tetap: Rabu, 1 Juli 2026. H+3 = 4 Juli.
const pickup = { fulfillmentType: "PICKUP", requestCakeDate: "2026-07-04" };
const delivery = {
   fulfillmentType: "DELIVERY",
   requestCakeDate: "2026-07-04",
   recipientType: "FOR_MYSELF",
   address: "Jl. Margonda Raya No. 100, Depok",
   addressLat: -6.3754,
   addressLng: 106.8323,
};

// Isi keranjang: 2 box Nutella Cupcakes isi 6 (Rp150.000) dan 1 Cadbury
// Premium Fudge Brownies (Rp75.000). Subtotal Rp375.000.
const cartWithItems = {
   id: "cart-1",
   items: [
      {
         productId: "prod-cupcake",
         variantId: "var-box6",
         flavor: null,
         filling: null,
         topping: null,
         customImage: null,
         textOnCake: null,
         notes: "Tolong pakai pita",
         quantity: 2,
         price: "150000",
         product: { name: "Nutella Cupcakes" },
      },
      {
         productId: "prod-brownies",
         variantId: null,
         flavor: null,
         filling: null,
         topping: null,
         customImage: null,
         textOnCake: null,
         notes: null,
         quantity: 1,
         price: "75000",
         product: { name: "Cadbury Premium Fudge Brownies" },
      },
   ],
};

beforeEach(() => {
   vi.resetAllMocks();
   vi.useFakeTimers({ toFake: ["Date"] });
   vi.setSystemTime(new Date(2026, 6, 1, 10, 0, 0));

   cartRepository.findCartWithItemsByUserId.mockResolvedValue(cartWithItems);
   orderRepository.createOrderWithItems.mockImplementation(async (data) => ({
      id: "a1b2c3d4-0000-4000-8000-000000000000",
      ...data,
      items: data.items.create.map((item) => ({ ...item, variant: null })),
      user: { name: "Siti Aminah", phone: "081234567890" },
   }));
});

afterEach(() => {
   vi.useRealTimers();
});

describe("previewCheckout", () => {
   it("ambil sendiri: tanpa ongkir dan tanpa menghitung jarak", async () => {
      const summary = await previewCheckout(USER, pickup);

      expect(summary).toMatchObject({
         subtotal: 375000,
         distanceKm: null,
         deliveryFee: 0,
         total: 375000,
      });
      expect(getDeliveryDistanceKm).not.toHaveBeenCalled();
   });

   it.each([
      [3.2, 30000],
      [7.5, 45000],
      [10.5, 55000],
      [18, 65000],
      [24.9, 75000],
   ])("pengiriman %s km: ongkir Rp%s", async (km, fee) => {
      getDeliveryDistanceKm.mockResolvedValue(km);

      const summary = await previewCheckout(USER, delivery);

      expect(summary).toMatchObject({
         subtotal: 375000,
         distanceKm: km,
         deliveryFee: fee,
         total: 375000 + fee,
      });
   });

   it("menghitung jarak dari titik toko ke titik alamat", async () => {
      getDeliveryDistanceKm.mockResolvedValue(3);
      await previewCheckout(USER, delivery);
      expect(getDeliveryDistanceKm).toHaveBeenCalledWith(
         -6.4025,
         106.7942,
         -6.3754,
         106.8323
      );
   });

   it("menolak jarak lebih dari 25 km dengan pesan yang jelas", async () => {
      getDeliveryDistanceKm.mockResolvedValue(25.1);
      await expect(previewCheckout(USER, delivery)).rejects.toMatchObject({
         statusCode: 422,
         message:
            "Alamat di luar radius pengiriman 25 km. Silakan hubungi kami untuk informasi biaya pengiriman.",
      });
   });

   it("menolak keranjang kosong", async () => {
      cartRepository.findCartWithItemsByUserId.mockResolvedValue({
         id: "cart-1",
         items: [],
      });
      await expect(previewCheckout(USER, pickup)).rejects.toMatchObject({
         statusCode: 422,
         message: "Keranjang kosong, tidak bisa checkout",
      });
   });

   it("menolak pengguna yang belum punya keranjang", async () => {
      cartRepository.findCartWithItemsByUserId.mockResolvedValue(null);
      await expect(previewCheckout(USER, pickup)).rejects.toMatchObject({
         statusCode: 422,
      });
   });

   it("mengabaikan subtotal, ongkir, dan total yang dikirim client", async () => {
      getDeliveryDistanceKm.mockResolvedValue(18);

      const summary = await previewCheckout(USER, {
         ...delivery,
         subtotal: 1,
         deliveryFee: 0,
         total: 1,
         distanceKm: 1,
      });

      expect(summary).toMatchObject({
         subtotal: 375000,
         distanceKm: 18,
         deliveryFee: 65000,
         total: 440000,
      });
   });

   // Harga yang dipakai adalah harga yang dihitung server saat barang masuk
   // keranjang, bukan harga produk saat checkout. Lihat bagian "Temuan" di
   // RENCANA-TESTING.md.
   it("memakai harga yang tersimpan di keranjang", async () => {
      const summary = await previewCheckout(USER, pickup);
      expect(summary.items.map((i) => i.price)).toEqual(["150000", "75000"]);
      expect(summary.items[0]).toMatchObject({
         productName: "Nutella Cupcakes",
         quantity: 2,
         notes: "Tolong pakai pita",
      });
   });

   it("boleh tanpa tanggal selama koordinat ada", async () => {
      getDeliveryDistanceKm.mockResolvedValue(3);
      const { requestCakeDate, ...noDate } = delivery;
      await expect(previewCheckout(USER, noDate)).resolves.toMatchObject({
         deliveryFee: 30000,
      });
   });

   it("menolak data rusak sebelum membaca keranjang", async () => {
      await expect(
         previewCheckout(USER, { fulfillmentType: "DELIVERY" })
      ).rejects.toMatchObject({ statusCode: 422, message: "Validasi gagal" });
      expect(cartRepository.findCartWithItemsByUserId).not.toHaveBeenCalled();
   });

   it("tidak menyimpan apa pun", async () => {
      await previewCheckout(USER, pickup);
      expect(orderRepository.createOrderWithItems).not.toHaveBeenCalled();
      expect(cartRepository.deleteAllCartItems).not.toHaveBeenCalled();
   });
});

describe("confirmCheckout", () => {
   const savedOrder = () =>
      orderRepository.createOrderWithItems.mock.calls[0][0];

   it("menyimpan pesanan dengan hitungan yang sama dengan preview", async () => {
      getDeliveryDistanceKm.mockResolvedValue(7.5);

      await confirmCheckout(USER, delivery);

      expect(savedOrder()).toMatchObject({
         userId: USER,
         fulfillmentType: "DELIVERY",
         recipientType: "FOR_MYSELF",
         address: delivery.address,
         addressLat: delivery.addressLat,
         addressLng: delivery.addressLng,
         distanceKm: 7.5,
         subtotal: 375000,
         deliveryFee: 45000,
         total: 420000,
      });
      expect(savedOrder().items.create).toHaveLength(2);
   });

   it("ambil sendiri tidak menyimpan alamat walau client mengirimnya", async () => {
      await confirmCheckout(USER, {
         ...pickup,
         address: "Jl. Lain",
         addressLat: -6.1,
         addressLng: 106.1,
         recipientType: "FOR_MYSELF",
      });

      expect(savedOrder()).toMatchObject({
         recipientType: null,
         recipientName: null,
         recipientPhone: null,
         recipientDataConsent: false,
         address: null,
         addressLat: null,
         addressLng: null,
         deliveryFee: 0,
      });
   });

   // Komentar di confirmCheckout menyebut data penerima tidak ikut tersimpan
   // untuk PICKUP, tapi pemeriksaan "untuk orang lain" tidak melihat cara
   // pengambilan. Lihat bagian "Temuan" di RENCANA-TESTING.md.
   it("ambil sendiri masih menyimpan nama penerima kalau client mengirim FOR_SOMEONE_ELSE", async () => {
      await confirmCheckout(USER, {
         ...pickup,
         recipientType: "FOR_SOMEONE_ELSE",
         recipientName: "Budi",
      });

      expect(savedOrder()).toMatchObject({
         recipientType: null,
         recipientName: "Budi",
         address: null,
      });
   });

   it("data penerima hanya disimpan kalau untuk orang lain", async () => {
      getDeliveryDistanceKm.mockResolvedValue(3);
      await confirmCheckout(USER, { ...delivery, recipientName: "Budi" });
      expect(savedOrder().recipientName).toBeNull();
   });

   it("mengosongkan keranjang setelah pesanan tersimpan", async () => {
      await confirmCheckout(USER, pickup);
      expect(cartRepository.deleteAllCartItems).toHaveBeenCalledWith("cart-1");
   });

   it("menyimpan pesan WhatsApp dan mengembalikan tautan ke nomor toko", async () => {
      const { whatsappLink } = await confirmCheckout(USER, pickup);

      const message = orderRepository.updateWhatsappMessage.mock.calls[0][1];
      expect(orderRepository.updateWhatsappMessage).toHaveBeenCalledWith(
         "a1b2c3d4-0000-4000-8000-000000000000",
         message
      );
      expect(message).toContain("Order #A1B2C3D4");
      expect(message).toContain("*Total: Rp375.000*");
      expect(whatsappLink).toBe(
         `https://wa.me/6281200000000?text=${encodeURIComponent(message)}`
      );
   });

   it("tidak menyimpan apa pun kalau di luar jangkauan", async () => {
      getDeliveryDistanceKm.mockResolvedValue(30);
      await expect(confirmCheckout(USER, delivery)).rejects.toMatchObject({
         statusCode: 422,
      });
      expect(orderRepository.createOrderWithItems).not.toHaveBeenCalled();
      expect(cartRepository.deleteAllCartItems).not.toHaveBeenCalled();
   });

   it("menolak pengiriman tanpa alamat, walau preview menerimanya", async () => {
      const { address, ...noAddress } = delivery;
      await expect(confirmCheckout(USER, noAddress)).rejects.toMatchObject({
         statusCode: 422,
         message: "Validasi gagal",
      });
   });
});

describe("pesanan pelanggan & admin", () => {
   it("menolak melihat pesanan milik pengguna lain", async () => {
      orderRepository.findOrderById.mockResolvedValue({
         id: "order-1",
         userId: "user-lain",
      });
      await expect(getOrderById(USER, "order-1")).rejects.toMatchObject({
         statusCode: 404,
         message: "Order tidak ditemukan",
      });
   });

   it("mengembalikan pesanan milik sendiri", async () => {
      const order = { id: "order-1", userId: USER };
      orderRepository.findOrderById.mockResolvedValue(order);
      await expect(getOrderById(USER, "order-1")).resolves.toBe(order);
   });

   it("admin hanya menerima identitas & kontak pemesan", async () => {
      orderRepository.findAllOrders.mockResolvedValue([
         {
            id: "order-1",
            user: {
               id: USER,
               name: "Siti Aminah",
               email: "siti@example.com",
               phone: "081234567890",
               password: "$2b$10$hash",
               role: "CUSTOMER",
            },
         },
      ]);

      const [order] = await getAllOrdersForAdmin();

      expect(order.user).toEqual({
         id: USER,
         name: "Siti Aminah",
         email: "siti@example.com",
         phone: "081234567890",
      });
   });

   it("mengubah status pesanan yang ada", async () => {
      orderRepository.findOrderById.mockResolvedValue({ id: "order-1" });
      await updateOrderStatusByAdmin("order-1", "CONFIRMED");
      expect(orderRepository.updateOrderStatus).toHaveBeenCalledWith(
         "order-1",
         "CONFIRMED"
      );
   });

   it("menolak mengubah status pesanan yang tidak ada", async () => {
      orderRepository.findOrderById.mockResolvedValue(null);
      await expect(
         updateOrderStatusByAdmin("order-x", "CONFIRMED")
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(orderRepository.updateOrderStatus).not.toHaveBeenCalled();
   });
});
