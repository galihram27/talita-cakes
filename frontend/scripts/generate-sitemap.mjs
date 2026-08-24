// scripts/generate-sitemap.mjs

/**
 * Membuat peta situs & aturan penelusuran untuk mesin pencari.
 *
 * Berjalan otomatis setiap selesai build. Cara kerjanya sederhana: menyusuri
 * berkas HTML yang baru saja dihasilkan, lalu mengubah nama berkasnya jadi
 * daftar alamat halaman.
 *
 * Karena bekerja dari berkas hasil build, halaman produk ikut terdaftar
 * dengan sendirinya tanpa perlu bertanya ke server — apa pun yang berhasil
 * dibangun jadi HTML pasti masuk daftar.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd() // selalu dijalankan dari folder frontend
const DIST = join(ROOT, 'dist')

// Alamat situs, dicari di environment variable dulu baru di berkas .env.
// Urutan itu disengaja: saat deploy, alamatnya diberikan lewat environment
// variable dan harus menang atas isi .env yang dipakai saat mengembangkan.
function loadSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL.replace(/\/+$/, '')
  try {
    const env = readFileSync(join(ROOT, '.env'), 'utf8')
    const m = env.match(/^VITE_SITE_URL\s*=\s*["']?([^"'\r\n]+)/m)
    if (m) return m[1].replace(/\/+$/, '')
  } catch {
    // .env tidak ada — abaikan
  }
  return ''
}

const SITE_URL = loadSiteUrl()

// Kumpulkan semua berkas .html, termasuk yang ada di dalam subfolder
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (name.endsWith('.html')) out.push(full)
  }
  return out
}

if (!existsSync(DIST)) {
  console.warn('[sitemap] folder dist/ tidak ada — jalankan build dulu.')
  process.exit(0)
}

// Ubah nama berkas jadi alamat halaman:
//   dist/index.html          -> "/"
//   dist/menu.html           -> "/menu"
//   dist/product/<id>.html   -> "/product/<id>"
// Halaman 404 dibuang, karena tidak ada gunanya didaftarkan ke mesin pencari.
const paths = [
  ...new Set(
    walk(DIST)
      .map((f) => '/' + relative(DIST, f).split(sep).join('/'))
      .map((p) => p.replace(/\/index\.html$/, '/').replace(/\.html$/, ''))
      .map((p) => (p === '' ? '/' : p))
      .filter((p) => p !== '/404' && p !== '/not-found')
  ),
].sort()

const today = new Date().toISOString().slice(0, 10)

// ===== sitemap.xml =====
const urlEntries = paths
  .map((p) => {
    const loc = SITE_URL ? `${SITE_URL}${p}` : p
    return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>`
  })
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`
writeFileSync(join(DIST, 'sitemap.xml'), sitemap)

// ===== robots.txt =====
// Halaman yang dilarang ditelusuri: yang isinya pribadi (keranjang, profil,
// panel admin) dan yang tidak ada gunanya muncul di hasil pencarian
// (login, daftar, atur ulang sandi).
const robotsLines = [
  'User-agent: *',
  'Disallow: /admin',
  'Disallow: /cart',
  'Disallow: /checkout',
  'Disallow: /profile',
  'Disallow: /order-success',
  'Disallow: /login',
  'Disallow: /register',
  'Disallow: /verify-email',
  'Disallow: /forgot-password',
  'Disallow: /reset-password',
  'Allow: /',
  '',
]
if (SITE_URL) robotsLines.push(`Sitemap: ${SITE_URL}/sitemap.xml`, '')
writeFileSync(join(DIST, 'robots.txt'), robotsLines.join('\n'))

console.log(
  `[sitemap] ${paths.length} URL -> dist/sitemap.xml` +
    (SITE_URL ? `` : ` (VITE_SITE_URL kosong → <loc> relatif; set domain saat deploy)`)
)
console.log('[robots] dist/robots.txt ditulis')
