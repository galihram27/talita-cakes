-- Dimensi kedua untuk varian shape SQUARE (mis. 20x10 -> size=20, sizeB=10).
-- Dipakai TYPE5 (non-cake). Nullable: ROUND & seluruh varian lama tetap valid.
ALTER TABLE "product_variants" ADD COLUMN     "sizeB" INTEGER;
