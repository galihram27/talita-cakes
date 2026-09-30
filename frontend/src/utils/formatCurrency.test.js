import { describe, it, expect } from 'vitest'
// Sengaja lewat alias `@/`, supaya kelihatan alias dari vite.config.js ikut
// berlaku di test.
import { formatRupiah } from '@/utils/formatCurrency'

describe('formatRupiah', () => {
  it('memakai titik sebagai pemisah ribuan', () => {
    expect(formatRupiah(150000)).toBe('Rp150.000')
  })
})
