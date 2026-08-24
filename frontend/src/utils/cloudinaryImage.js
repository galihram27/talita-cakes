// src/utils/cloudinaryImage.js

/**
 * Ubah alamat gambar Cloudinary supaya yang diunduh versi kecilnya saja.
 *
 * Gambar aslinya disimpan sampai 1600 piksel. Untuk foto kecil di daftar
 * produk, mengunduh ukuran sebesar itu jelas mubazir — apalagi bagi pengunjung
 * yang memakai kuota seluler.
 *
 * Caranya cukup menyisipkan perintah ke alamatnya; Cloudinary yang mengecilkan
 * di sisinya, jadi tidak ada pekerjaan tambahan di peramban:
 * - w_<lebar> membatasi lebarnya
 * - f_auto memilih format gambar teringan yang didukung peramban itu
 * - q_auto menentukan tingkat kompresi secukupnya
 *
 * Alamat yang bukan dari Cloudinary dikembalikan apa adanya, jadi aman
 * dipanggil untuk gambar dari sumber mana pun.
 */
export const cloudinaryThumb = (url, width = 400) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`)
}
