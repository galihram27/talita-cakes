// Harga setelah diskon, dibulatkan ke 2 desimal. Hanya untuk ditampilkan;
// harga yang mengikat tetap dihitung server. Rumusnya harus sama persis dengan
// applyDiscount di backend/src/features/cart/cart.service.js, kalau tidak
// harga di halaman produk bisa berbeda dari harga di keranjang.
export const applyDiscount = (price, discount) => {
  const base = Number(price)
  const percent = Number(discount ?? 0)
  return Math.round((base - (base * percent) / 100) * 100) / 100
}
