import { describe, it, expect } from 'vitest'
import { cloudinaryThumb } from './cloudinaryImage'

const CLOUDINARY = 'https://res.cloudinary.com/talita/image/upload/v1712345678/products/shortcake.jpg'

describe('cloudinaryThumb', () => {
  it('menyisipkan lebar 400 piksel secara bawaan', () => {
    expect(cloudinaryThumb(CLOUDINARY)).toBe(
      'https://res.cloudinary.com/talita/image/upload/w_400,c_limit,f_auto,q_auto/v1712345678/products/shortcake.jpg',
    )
  })

  it('memakai lebar yang diminta', () => {
    expect(cloudinaryThumb(CLOUDINARY, 800)).toContain('/upload/w_800,c_limit,f_auto,q_auto/')
  })

  it('membiarkan alamat yang bukan dari Cloudinary', () => {
    const url = 'https://example.com/upload/foto.jpg'
    expect(cloudinaryThumb(url)).toBe(url)
  })

  it.each([null, undefined, '', 123])('mengembalikan %s apa adanya', (value) => {
    expect(cloudinaryThumb(value)).toBe(value)
  })
})
