import { defineStore } from 'pinia'

/**
 * Penyaringan yang sedang aktif di halaman Menu.
 *
 * Disimpan terpisah dari halamannya supaya tidak hilang saat pengunjung
 * membuka sebuah produk lalu kembali. Tanpa ini, penyaringan selalu kembali
 * ke "Semua" dan pengunjung harus mengatur ulang setiap kali — melelahkan
 * kalau ia sedang membanding-bandingkan beberapa kue.
 *
 * Isinya hanya data, tanpa fungsi: halaman Menu yang membaca dan mengubahnya.
 */

export const useMenuFilterStore = defineStore('menuFilter', {
  state: () => ({
    activeFilter: 'ALL', // 'ALL' atau salah satu tipe produk
    search: '',
    activeSort: 'default',
    // Kategori & sub-kategori terpilih dicatat per tipe produk, jadi pilihan
    // di satu tipe tidak ikut hilang saat pengunjung melihat tipe lain
    sectionCategory: {},
    sectionSubcategory: {},
    expandedType: null, // daftar kategori yang sedang dibuka di panel samping
    currentPage: 1,
  }),
})
