import { describe, it, expect } from 'vitest'
import { DELIVERY_FEE_TIERS, MAX_DELIVERY_DISTANCE_KM, deliveryTierIndex } from './constants'
// Berkas backend ini tidak meng-import apa pun, jadi aman di-import langsung.
import * as be from '../../../backend/src/features/order/order.helper.js'

// Setiap 0,1 km dari 0,1 sampai 25 km. Dibulatkan supaya 0,1 + 0,2 tidak
// menjadi 0,30000000000000004.
const DISTANCES = Array.from({ length: 250 }, (_, i) => Math.round((i + 1) * 10) / 100)

// Tabel tarif di checkout hanya salinan untuk dibaca pembeli; ongkir yang
// ditagih dihitung server. Kalau keduanya tidak sama, baris yang disorot di
// checkout bisa menunjukkan tarif yang berbeda dari yang ditagih.
describe('tarif ongkir sama dengan backend', () => {
  it('batas jangkauan', () => {
    expect(MAX_DELIVERY_DISTANCE_KM).toBe(be.MAX_DELIVERY_DISTANCE_KM)
  })

  it('tarif yang disorot sama dengan yang ditagih server, untuk setiap jarak', () => {
    const mismatches = DISTANCES.filter(
      (km) => DELIVERY_FEE_TIERS[deliveryTierIndex(km)]?.fee !== be.calculateDeliveryFee(km),
    )
    expect(mismatches).toEqual([])
  })

  it('setiap baris tarif benar-benar terpakai', () => {
    const used = new Set(DISTANCES.map(deliveryTierIndex))
    expect([...used].sort((a, b) => a - b)).toEqual(DELIVERY_FEE_TIERS.map((_, i) => i))
  })

  it('tidak ada baris yang disorot di luar jangkauan atau tanpa jarak', () => {
    expect(deliveryTierIndex(25.1)).toBe(-1)
    expect(be.calculateDeliveryFee(25.1)).toBeNull()
    expect(deliveryTierIndex(null)).toBe(-1)
    expect(deliveryTierIndex(0)).toBe(-1)
  })
})
