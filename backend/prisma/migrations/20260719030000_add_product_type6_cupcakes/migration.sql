-- AlterEnum
-- TYPE6 = Cupcakes. Tidak butuh kolom baru: varian cupcake memakai kembali
-- ProductVariant.size sebagai ISI BOX (4/6/9/12 pcs) dengan shape NULL,
-- memanfaatkan nullable yang sudah dibuat untuk TYPE5.
ALTER TYPE "ProductType" ADD VALUE 'TYPE6';
