// Menyimpan state filter halaman Menu (tipe, kategori, sub-kategori, pencarian,
// urutan, halaman) supaya tetap terjaga saat user membuka detail produk lalu
// kembali ke Menu — tidak selalu balik ke filter "All".
import { defineStore } from 'pinia'

export const useMenuFilterStore = defineStore('menuFilter', {
  state: () => ({
    activeFilter: 'ALL', // ALL | TYPE1..TYPE6
    search: '',
    activeSort: 'default',
    sectionCategory: {}, // { [typeKey]: category }
    sectionSubcategory: {}, // { [typeKey]: subcategory }
    expandedType: null, // dropdown kategori yang sedang terbuka di sidebar
    currentPage: 1,
  }),
})
