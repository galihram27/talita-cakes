import { describe, it, expect } from 'vitest'
import id from './id'
import en from './en'
import idAbout from './id/about.js'

// Ratakan objek bertingkat jadi daftar kunci bertitik, mis. 'nav.menu'.
const flattenKeys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flattenKeys(value, path)
      : [path]
  })

// Dibandingkan per arah, bukan jumlahnya saja, supaya pesan gagalnya langsung
// menyebut kunci mana yang hilang dan di berkas mana.
const missingKeys = (from, to) => {
  const target = new Set(flattenKeys(to))
  return flattenKeys(from).filter((key) => !target.has(key))
}

describe('kunci terjemahan', () => {
  it('setiap kunci di id.js juga ada di en.js', () => {
    expect(missingKeys(id, en)).toEqual([])
  })

  it('setiap kunci di en.js juga ada di id.js', () => {
    // Kunci yang hanya ada di en.js tampil dalam bahasa Inggris di situs
    // berbahasa Indonesia, karena bahasa Inggris dipakai sebagai cadangan.
    expect(missingKeys(en, id)).toEqual([])
  })

  // id/about.js menimpa bagian `about` di id.js (lihat i18n/index.js), jadi
  // yang benar-benar tampil adalah isi berkas itu, bukan salinan di id.js.
  it('setiap kunci di id/about.js juga ada di en.js', () => {
    expect(missingKeys(idAbout, en.about)).toEqual([])
  })

  it('setiap kunci about di en.js juga ada di id/about.js', () => {
    expect(missingKeys(en.about, idAbout)).toEqual([])
  })

  it('tidak ada teks yang kosong', () => {
    const empty = (obj) =>
      flattenKeys(obj).filter(
        (key) => key.split('.').reduce((o, k) => o[k], obj) === '',
      )
    expect(empty(id)).toEqual([])
    expect(empty(en)).toEqual([])
    expect(empty(idAbout)).toEqual([])
  })
})
