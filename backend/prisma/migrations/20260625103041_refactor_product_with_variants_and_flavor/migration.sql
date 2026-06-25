/*
  Warnings:

  - The values [TYPE_1,TYPE_2,TYPE_3] on the enum `ProductType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sizeOption` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `flavorId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `shape` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `products` table. All the data in the column will be lost.
  - You are about to alter the column `discount` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(5,2)`.
  - You are about to drop the `flavors` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[productId,shape,size]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `size` to the `product_variants` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `image` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductType_new" AS ENUM ('TYPE1', 'TYPE2', 'TYPE3');
ALTER TABLE "products" ALTER COLUMN "type" TYPE "ProductType_new" USING ("type"::text::"ProductType_new");
ALTER TYPE "ProductType" RENAME TO "ProductType_old";
ALTER TYPE "ProductType_new" RENAME TO "ProductType";
DROP TYPE "public"."ProductType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_flavorId_fkey";

-- DropIndex
DROP INDEX "product_variants_productId_sizeOption_key";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "sizeOption",
ADD COLUMN     "size" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "flavorId",
DROP COLUMN "isActive",
DROP COLUMN "price",
DROP COLUMN "shape",
DROP COLUMN "size",
ADD COLUMN     "flavor" TEXT,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "image" SET NOT NULL,
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(5,2);

-- DropTable
DROP TABLE "flavors";

-- DropEnum
DROP TYPE "SizeOption";

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_shape_size_key" ON "product_variants"("productId", "shape", "size");
