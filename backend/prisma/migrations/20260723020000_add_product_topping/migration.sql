-- Konfigurasi pilihan "Topping" per produk (sub-kategori CINROLLS VAN DEPOK).
-- Bentuk JSON: { options: [{ name }], maxSelect }. Wajib pilih min 1, tanpa harga.
ALTER TABLE "products" ADD COLUMN     "topping" JSONB;

-- Snapshot pilihan topping user pada item keranjang & pesanan (nama tergabung).
ALTER TABLE "cart_items" ADD COLUMN     "topping" TEXT;
ALTER TABLE "order_items" ADD COLUMN     "topping" TEXT;
