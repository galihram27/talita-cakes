-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE 'TYPE5';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "subcategory" TEXT;

-- AlterTable: shape & size jadi opsional supaya produk non-cake (TYPE5)
-- bisa punya varian harga tunggal tanpa bentuk/ukuran kue.
ALTER TABLE "product_variants" ALTER COLUMN "shape" DROP NOT NULL;
ALTER TABLE "product_variants" ALTER COLUMN "size" DROP NOT NULL;
