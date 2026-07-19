-- Membatalkan 20260719010000_type5_subcategory_titlecase.
-- Sub-kategori TYPE5 dikembalikan ke HURUF KAPITAL SEMUA sesuai permintaan.
-- Nilai di DB harus ikut dikembalikan agar tetap cocok dengan daftar
-- sub-kategori valid di product.constant.js (kalau tidak, admin gagal
-- menyimpan saat mengedit produk TYPE5 yang sudah ada).
UPDATE "products" SET "subcategory" = 'CINROLLS VAN DEPOK'               WHERE "subcategory" = 'Cinrolls Van Depok';
UPDATE "products" SET "subcategory" = 'MOZZARELLA SAUSAGE ROLLS'         WHERE "subcategory" = 'Mozzarella Sausage Rolls';
UPDATE "products" SET "subcategory" = 'BASQUE BURNT CHEESE CAKE'         WHERE "subcategory" = 'Basque Burnt Cheese Cake';
UPDATE "products" SET "subcategory" = 'SIGNATURE PREMIUM FUDGE BROWNIES' WHERE "subcategory" = 'Signature Premium Fudge Brownies';
UPDATE "products" SET "subcategory" = 'SIGNATURE ASSORTED BROWNIES BOX'  WHERE "subcategory" = 'Signature Assorted Brownies Box';
UPDATE "products" SET "subcategory" = 'SIGNATURE CUSTOM BROWNIES BOX'    WHERE "subcategory" = 'Signature Custom Brownies Box';
