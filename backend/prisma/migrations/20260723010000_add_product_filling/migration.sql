-- Konfigurasi pilihan "Filling" per produk (sub-kategori CINROLLS VAN DEPOK).
-- Bentuk JSON: { options: [{ name, price }], multiple, maxSelect, defaultIndex }.
ALTER TABLE "products" ADD COLUMN     "filling" JSONB;

-- Snapshot pilihan filling user pada item keranjang & pesanan (nama tergabung).
ALTER TABLE "cart_items" ADD COLUMN     "filling" TEXT;
ALTER TABLE "order_items" ADD COLUMN     "filling" TEXT;
