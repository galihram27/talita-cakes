// src/utils/chatMarkdown.js

/**
 * Ubah jawaban asisten menjadi HTML untuk ditampilkan di widget chat.
 *
 * Model membalas dengan Markdown sederhana: tebal, daftar berbutir atau
 * bernomor, dan tautan. Hanya itu yang dikenali; sisanya tampil sebagai teks
 * biasa. Sengaja tidak memakai pustaka Markdown — bagian kecil ini cukup, dan
 * jauh lebih mudah dipastikan aman.
 *
 * KEAMANAN: jawaban model tidak bisa dipercaya. Pembeli bisa memancingnya
 * menulis `<script>` atau tautan `javascript:`. Karena itu seluruh teks
 * di-escape LEBIH DULU, baru tag yang dikenali disusun sendiri di sini, dan
 * tautan hanya dibuat untuk alamat http/https.
 */

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const link = (url, label) =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`

// `[label](https://...)` atau alamat polos. Keduanya dicari dalam satu
// langkah supaya alamat yang sudah jadi tautan tidak dibungkus dua kali.
// Tanda baca di ujung alamat polos dianggap penutup kalimat, bukan alamat.
const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]*[^\s<.,!?)])/g

// Dijalankan pada teks yang sudah di-escape, jadi `url` di sini tidak bisa
// lagi memuat tanda kutip atau kurung sudut yang membobol atribut
const renderInline = (text) =>
  text
    .replace(LINK_PATTERN, (_, label, url, bare) => (bare ? link(bare, bare) : link(url, label)))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

export const renderChatMarkdown = (text) => {
  const lines = escapeHtml(text).split('\n')
  const html = []
  let list = null // 'ul' | 'ol' yang sedang terbuka
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (list) html.push(`</${list}>`)
    list = null
  }

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const item = bullet || numbered

    if (item) {
      flushParagraph()
      const type = bullet ? 'ul' : 'ol'
      if (list !== type) {
        closeList()
        html.push(`<${type}>`)
        list = type
      }
      html.push(`<li>${renderInline(item[1].trim())}</li>`)
    } else if (!line.trim()) {
      flushParagraph()
      closeList()
    } else {
      closeList()
      paragraph.push(line.trim())
    }
  }
  flushParagraph()
  closeList()

  return html.join('')
}
