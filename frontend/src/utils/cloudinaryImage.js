// src/utils/cloudinaryImage.js

// Sisipkan transformasi on-the-fly ke URL Cloudinary supaya thumbnail kecil
// tidak mengunduh gambar ukuran penuh (upload disimpan hingga 1600px).
// w_<width> membatasi lebar, f_auto memilih format modern (WebP/AVIF),
// q_auto mengatur kompresi otomatis.
// URL non-Cloudinary (mis. data URI lama / placeholder) dikembalikan apa adanya.
export const cloudinaryThumb = (url, width = 400) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`)
}
