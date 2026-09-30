import { describe, it, expect } from 'vitest'
import { renderChatMarkdown } from './chatMarkdown'

const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"'

describe('renderChatMarkdown: format yang dikenali', () => {
  it('mengubah **teks** jadi tebal', () => {
    expect(renderChatMarkdown('**Tebal** biasa')).toBe('<p><strong>Tebal</strong> biasa</p>')
  })

  it('mengubah [label](https://...) jadi tautan yang dibuka di tab baru', () => {
    expect(renderChatMarkdown('[Instagram](https://instagram.com/talitacakes)')).toBe(
      `<p><a href="https://instagram.com/talitacakes" ${LINK_ATTRS}>Instagram</a></p>`,
    )
  })

  it('mengubah alamat polos jadi tautan, tanpa titik penutup kalimat', () => {
    expect(renderChatMarkdown('Lihat https://talita.id/menu.')).toBe(
      `<p>Lihat <a href="https://talita.id/menu" ${LINK_ATTRS}>https://talita.id/menu</a>.</p>`,
    )
  })

  it('menyusun daftar berbutir dan bernomor', () => {
    expect(renderChatMarkdown('- satu\n- dua\n\n1. a\n2) b')).toBe(
      '<ul><li>satu</li><li>dua</li></ul><ol><li>a</li><li>b</li></ol>',
    )
  })

  it('baris berurutan jadi satu paragraf, baris kosong memisahkan paragraf', () => {
    expect(renderChatMarkdown('baris 1\nbaris 2\n\nparagraf 2')).toBe(
      '<p>baris 1<br>baris 2</p><p>paragraf 2</p>',
    )
  })
})

describe('renderChatMarkdown: tautan produk', () => {
  it('[Nama](#produk) jadi tautan produk yang tidak membuka tab baru', () => {
    const html = renderChatMarkdown('[Basque Burnt Cheese Cake](#produk)')
    expect(html).toBe(
      '<p><a href="/menu" data-product-name="Basque Burnt Cheese Cake">Basque Burnt Cheese Cake</a></p>',
    )
    expect(html).not.toContain('target="_blank"')
  })

  it('tanda tebal di dalam nama tidak ikut masuk ke data-product-name', () => {
    expect(renderChatMarkdown('[**Basque Burnt Cheese Cake**](#produk)')).toBe(
      '<p><a href="/menu" data-product-name="Basque Burnt Cheese Cake"><strong>Basque Burnt Cheese Cake</strong></a></p>',
    )
  })

  it('tanda kutip di nama tetap ter-escape di dalam atribut', () => {
    expect(renderChatMarkdown('[Brownies "Spesial"](#produk)')).toBe(
      '<p><a href="/menu" data-product-name="Brownies &quot;Spesial&quot;">Brownies &quot;Spesial&quot;</a></p>',
    )
  })
})

// Teks jawaban berasal dari model AI dan bisa dipancing pembeli. Tidak boleh
// ada jalan bagi teks itu untuk menjalankan kode di peramban pembeli.
describe('renderChatMarkdown: keamanan', () => {
  it('meng-escape tag <script>', () => {
    expect(renderChatMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('meng-escape tag dengan atribut onerror', () => {
    expect(renderChatMarkdown('<img src=x onerror="alert(1)">')).toBe(
      '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>',
    )
  })

  it('tautan javascript: tidak menjadi tautan', () => {
    expect(renderChatMarkdown('[klik](javascript:alert(1))')).toBe(
      '<p>[klik](javascript:alert(1))</p>',
    )
    expect(renderChatMarkdown('javascript:alert(1)')).toBe('<p>javascript:alert(1)</p>')
  })

  it('tanda kutip di alamat tidak bisa membobol atribut href', () => {
    const html = renderChatMarkdown('[x](https://a.com" onmouseover="alert(1))')
    expect(html).not.toContain('onmouseover="')
    expect(html).toContain('href="https://a.com&quot;"')
  })

  it('tag HTML di nama produk ter-escape, baik di atribut maupun di label', () => {
    expect(renderChatMarkdown("[Talita's <b>Cake</b>](#produk)")).toBe(
      '<p><a href="/menu" data-product-name="Talita&#39;s &lt;b&gt;Cake&lt;/b&gt;">Talita&#39;s &lt;b&gt;Cake&lt;/b&gt;</a></p>',
    )
  })

  it.each([
    ['/admin', 'Admin'],
    ['//evil.com', 'Evil'],
    ['/product/0b8f6c1e-1234-4abc-9def-1234567890ab', 'Kue'],
  ])('alamat relatif %s hanya tampil sebagai labelnya', (url, label) => {
    expect(renderChatMarkdown(`[${label}](${url})`)).toBe(`<p>${label}</p>`)
  })
})
