-- AlterTable: tambah kolom images (galeri banyak foto per produk)
ALTER TABLE "products" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: produk lama yang sudah punya 1 foto (image) dijadikan foto pertama di galeri
UPDATE "products" SET "images" = ARRAY["image"] WHERE "image" IS NOT NULL AND "image" <> '';
