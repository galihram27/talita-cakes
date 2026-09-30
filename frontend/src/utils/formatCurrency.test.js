import { describe, it, expect } from 'vitest'
// Sengaja lewat alias `@/`, supaya kelihatan alias dari vite.config.js ikut
// berlaku di test.
import { formatRupiah } from '@/utils/formatCurrency'

describe('formatRupiah', () => {
  it('memakai titik sebagai pemisah ribuan', () => {
    expect(formatRupiah(150000)).toBe('Rp150.000')
  })

  it('menampilkan 0 sebagai Rp0', () => {
    expect(formatRupiah(0)).toBe('Rp0')
  })

  it('menerima angka dalam bentuk teks, seperti yang dikirim API', () => {
    expect(formatRupiah('150000')).toBe('Rp150.000')
  })

  it('memakai koma untuk desimal dan tidak menambah nol di belakangnya', () => {
    // Harga setelah diskon bisa berdesimal, lihat applyDiscount di utils/price.js
    expect(formatRupiah(18667.6)).toBe('Rp18.667,6')
    expect(formatRupiah(66669.33)).toBe('Rp66.669,33')
  })
})
