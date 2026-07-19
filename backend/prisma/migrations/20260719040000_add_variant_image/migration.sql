-- AlterTable
-- Foto per varian, diambil dari Product.images. Dipakai TYPE6 supaya memilih
-- isi box menggeser galeri ke foto box tersebut. Nullable: varian tanpa foto
-- khusus membiarkan galeri apa adanya, dan seluruh varian lama tetap valid.
ALTER TABLE "product_variants" ADD COLUMN     "image" TEXT;
