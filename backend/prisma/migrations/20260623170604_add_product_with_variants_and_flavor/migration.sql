-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('TYPE_1', 'TYPE_2', 'TYPE_3');

-- CreateEnum
CREATE TYPE "Shape" AS ENUM ('ROUND', 'SQUARE');

-- CreateEnum
CREATE TYPE "SizeOption" AS ENUM ('ROUND_16_30', 'ROUND_18_30', 'ROUND_20_30', 'SQUARE_18_30', 'SQUARE_20_30');

-- CreateTable
CREATE TABLE "flavors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flavors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "flavorId" TEXT,
    "shape" "Shape",
    "size" TEXT,
    "price" DECIMAL(12,2),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shape" "Shape" NOT NULL,
    "sizeOption" "SizeOption" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flavors_name_key" ON "flavors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_sizeOption_key" ON "product_variants"("productId", "sizeOption");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "flavors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
