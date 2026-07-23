-- Flag produk yang dipajang di section "Our Cake Samples" pada halaman Home.
-- Default false: seluruh produk lama tidak ter-featured sampai admin menandainya.
ALTER TABLE "products" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;
