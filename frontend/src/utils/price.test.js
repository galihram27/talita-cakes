import { describe, it, expect } from 'vitest'
import { applyDiscount } from './price'

// Contoh angkanya sengaja sama persis dengan test applyDiscount di
// backend/src/features/cart/cart.service.test.js. Kalau rumus di salah satu
// sisi berubah, test di sisi itu gagal, jadi harga di halaman produk tidak
// bisa diam-diam berbeda dari harga di keranjang.
describe('applyDiscount', () => {
  it('mengembalikan harga dasar kalau diskon 0', () => {
    // Shortcake Series 14cm
    expect(applyDiscount(100000, 0)).toBe(100000)
  })

  it('memotong 10% dari harga dasar', () => {
    expect(applyDiscount(100000, 10)).toBe(90000)
  })

  it('menganggap diskon null sebagai tanpa diskon', () => {
    expect(applyDiscount(65000, null)).toBe(65000)
  })

  it('menganggap diskon undefined sebagai tanpa diskon', () => {
    expect(applyDiscount(65000, undefined)).toBe(65000)
  })

  it('menerima harga dan diskon dalam bentuk teks, seperti yang dikirim API', () => {
    expect(applyDiscount('150000', '10.00')).toBe(135000)
  })

  it('mengembalikan angka, bukan teks', () => {
    expect(typeof applyDiscount('150000', 0)).toBe('number')
  })

  it('menyisakan desimal kalau hasilnya tidak bulat', () => {
    // Brownies 75.000 diskon 15% = 63.750; goodiebag 26.000 diskon 12,5%
    expect(applyDiscount(75000, 15)).toBe(63750)
    expect(applyDiscount(26000, 12.5)).toBe(22750)
    expect(applyDiscount(27000, 33.3)).toBe(18009)
  })

  it('membulatkan ke 2 desimal', () => {
    // 28.000 - 28.000 x 33,33% = 18.667,6
    expect(applyDiscount(28000, 33.33)).toBe(18667.6)
    // 99.999 - 99.999 x 33,33% = 66.669,3333...
    expect(applyDiscount(99999, 33.33)).toBe(66669.33)
  })

  it('mengembalikan 0 untuk diskon 100%', () => {
    expect(applyDiscount(100000, 100)).toBe(0)
  })
})
