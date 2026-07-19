-- Sub-kategori TYPE5 sebelumnya disimpan HURUF KAPITAL SEMUA. Ubah ke Title Case
-- supaya konsisten dengan gaya kategori TYPE1-TYPE4 dan tidak "berteriak" di UI.
-- Produk lama harus ikut diperbarui, kalau tidak nilainya tidak lagi cocok
-- dengan daftar sub-kategori yang valid (gagal validasi saat admin edit produk).
UPDATE "products" SET "subcategory" = 'Cinrolls Van Depok'              WHERE "subcategory" = 'CINROLLS VAN DEPOK';
UPDATE "products" SET "subcategory" = 'Mozzarella Sausage Rolls'        WHERE "subcategory" = 'MOZZARELLA SAUSAGE ROLLS';
UPDATE "products" SET "subcategory" = 'Basque Burnt Cheese Cake'        WHERE "subcategory" = 'BASQUE BURNT CHEESE CAKE';
UPDATE "products" SET "subcategory" = 'Signature Premium Fudge Brownies' WHERE "subcategory" = 'SIGNATURE PREMIUM FUDGE BROWNIES';
UPDATE "products" SET "subcategory" = 'Signature Assorted Brownies Box'  WHERE "subcategory" = 'SIGNATURE ASSORTED BROWNIES BOX';
UPDATE "products" SET "subcategory" = 'Signature Custom Brownies Box'    WHERE "subcategory" = 'SIGNATURE CUSTOM BROWNIES BOX';
