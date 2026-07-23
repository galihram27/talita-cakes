-- Harga tambahan per kombinasi (filling + topping) untuk CINROLLS VAN DEPOK.
-- Bentuk JSON: [{ filling, topping, price }]. Total = harga dasar + Σ kombinasi.
ALTER TABLE "products" ADD COLUMN     "comboPrices" JSONB;
