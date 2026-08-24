import { useSeoMeta, useHead } from '@unhead/vue'
import { SITE_NAME, DEFAULT_DESCRIPTION, absUrl } from '@/config/seo'

/**
 * Pasang judul & keterangan halaman untuk mesin pencari dan pratinjau
 * tautan di media sosial.
 *
 * Dipakai halaman-halaman sederhana yang isinya tetap. Halaman produk tidak
 * memakai ini karena keterangannya disusun dari data produknya sendiri.
 *
 * Nama toko tidak perlu ditulis di `title` — App.vue yang menambahkannya
 * secara otomatis ke setiap judul halaman.
 *
 * `path` opsional. Kalau diisi, dipasang penunjuk alamat resmi halaman ini,
 * yang memberi tahu mesin pencari alamat mana yang harus dicatat bila halaman
 * yang sama bisa dibuka dari beberapa alamat berbeda.
 */
export function usePageSeo({ title, description, path } = {}) {
  const desc = description || DEFAULT_DESCRIPTION
  useSeoMeta({
    title,
    description: desc,
    ogTitle: title ? `${title} - ${SITE_NAME}` : SITE_NAME,
    ogDescription: desc,
  })
  const href = path ? absUrl(path) : null
  if (href) useHead({ link: [{ rel: 'canonical', href }] })
}
