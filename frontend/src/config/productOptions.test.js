import { describe, it, expect } from 'vitest'
import * as fe from './productOptions'
import { TYPE2_FLAVORS, CUSTOM_FLAVORS } from './constants'
// Berkas backend ini tidak meng-import apa pun, jadi aman di-import langsung
// dari test frontend tanpa ikut menarik Prisma atau .env.
import * as be from '../../../backend/src/features/product/product.constant.js'

// Menjaga aturan "dua berkas wajib sinkron" di CLAUDE.md. Kalau hanya satu
// sisi yang diubah, admin bisa memilih sesuatu yang lalu ditolak server, atau
// pilihan yang sah tidak pernah muncul di form.
describe('productOptions.js sama dengan product.constant.js di backend', () => {
  it('daftar kategori tiap tipe', () => {
    expect(fe.PRODUCT_CATEGORIES).toEqual(be.PRODUCT_CATEGORIES)
  })

  it('tipe produk yang ditawarkan di form sama dengan tipe yang punya kategori', () => {
    const types = fe.PRODUCT_TYPE_OPTIONS.map((o) => o.value)
    expect(types).toEqual(Object.keys(be.PRODUCT_CATEGORIES))
  })

  it('sub-kategori TYPE5', () => {
    expect(fe.TYPE5_SUBCATEGORIES).toEqual(be.TYPE5_SUBCATEGORIES)
  })

  it('sub-kategori TYPE5 yang ukurannya dipilih pembeli', () => {
    expect(fe.TYPE5_SIZE_SUBCATEGORIES).toEqual(be.TYPE5_SIZE_SUBCATEGORIES)
  })

  it('ukuran roti', () => {
    expect(fe.BREAD_CATEGORY).toBe(be.BREAD_CATEGORY)
    expect(fe.BREAD_SIZES).toEqual(be.BREAD_SIZES)
  })

  it('filling & topping Cinrolls', () => {
    expect(fe.CINROLLS_VAN_DEPOK).toBe(be.CINROLLS_VAN_DEPOK)
    expect(fe.MAX_FILLING_OPTIONS).toBe(be.MAX_FILLING_OPTIONS)
    expect(fe.MAX_TOPPING_OPTIONS).toBe(be.MAX_TOPPING_OPTIONS)
    expect(fe.MAX_TOPPING_SELECT).toBe(be.MAX_TOPPING_SELECT)
  })

  // Daftar rasa TYPE2 & TYPE4 di frontend tinggal di constants.js, bukan di
  // productOptions.js, tapi tetap salinan dari backend.
  it('rasa TYPE2 dan TYPE4', () => {
    expect(TYPE2_FLAVORS).toEqual(be.TYPE2_FLAVORS)
    expect(CUSTOM_FLAVORS).toEqual(be.CUSTOM_FLAVORS)
  })

  it('aturan tiap kategori cupcake, termasuk rasa dan isi box', () => {
    expect(fe.TYPE6_CATEGORY_CONFIG).toEqual(be.TYPE6_CATEGORY_CONFIG)
  })

  it('sub-kategori goodiebag beserta rasa dan batasnya', () => {
    expect(fe.GOODIEBAG_SUBCATEGORIES).toEqual(be.GOODIEBAG_SUBCATEGORIES)
  })
})

// Fungsi pembantu dicoba dengan setiap kategori & sub-kategori yang ada,
// ditambah nilai yang tidak dikenal, dan jawabannya harus sama di kedua sisi.
describe('fungsi pembantu memberi jawaban yang sama dengan backend', () => {
  const UNKNOWN = ['Tidak Ada', '', undefined, null]
  const categories = [...Object.values(be.PRODUCT_CATEGORIES).flat(), ...UNKNOWN]
  const subcategories = [
    ...Object.values(be.TYPE5_SUBCATEGORIES).flat(),
    ...Object.keys(be.GOODIEBAG_SUBCATEGORIES),
    ...UNKNOWN,
  ]

  const byCategory = [
    'isBreadCategory',
    'type5HasSubcategories',
    'cupcakeFlavorsForCategory',
    'cupcakeBoxesForCategory',
    'isFixedFlavorCupcake',
    'isGoodiebagCupcake',
    'goodiebagMinQty',
    'isMultiFlavorCupcake',
    'cupcakeFlavorLimit',
  ]

  const bySubcategory = [
    'type5SizeConfig',
    'isType5SizeSubcategory',
    'usesFilling',
    'usesTopping',
    'goodiebagFlavorsForSubcategory',
    'goodiebagFlavorLimit',
    'isGoodiebagSubcategory',
  ]

  it.each(byCategory)('%s', (name) => {
    for (const category of categories) {
      expect(fe[name](category), `${name}(${category})`).toEqual(be[name](category))
    }
  })

  it.each(bySubcategory)('%s', (name) => {
    for (const subcategory of subcategories) {
      expect(fe[name](subcategory), `${name}(${subcategory})`).toEqual(be[name](subcategory))
    }
  })

  it('breadSizeByKey', () => {
    for (const key of [...be.BREAD_SIZE_KEYS, 'JUMBO', undefined]) {
      expect(fe.breadSizeByKey(key), key).toEqual(be.breadSizeByKey(key))
    }
  })

  it('breadSizeForVariant', () => {
    const variants = [
      ...be.BREAD_SIZES.map(({ shape, size, sizeB }) => ({ shape, size, sizeB })),
      // Dari basis data, kolom kosong bisa datang sebagai undefined
      { shape: 'ROUND', size: 25 },
      { size: 9 },
      { shape: 'SQUARE', size: 22, sizeB: 11 },
    ]
    for (const v of variants) {
      expect(fe.breadSizeForVariant(v), JSON.stringify(v)).toEqual(be.breadSizeForVariant(v))
    }
  })

  it('goodiebagSubcategories', () => {
    expect(fe.goodiebagSubcategories()).toEqual(be.goodiebagSubcategories())
  })
})
