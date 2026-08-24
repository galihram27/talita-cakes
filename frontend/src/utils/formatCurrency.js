// Tampilkan angka sebagai rupiah, mis. 150000 -> "Rp150.000".
// Pemisah ribuannya mengikuti penulisan Indonesia (titik, bukan koma).
export const formatRupiah = (amount) =>
  `Rp${Number(amount).toLocaleString('id-ID')}`
