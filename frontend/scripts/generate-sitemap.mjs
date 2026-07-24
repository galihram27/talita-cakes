// scripts/generate-sitemap.mjs
// Dijalankan sebagai `postbuild` (setelah vite-ssg build). Membaca file HTML
// yang sudah diprerender di dist/ (termasuk halaman produk) lalu menulis
// dist/sitemap.xml & dist/robots.txt. Tidak perlu backend — cukup daftar file.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd() // dijalankan dari folder frontend
const DIST = join(ROOT, 'dist')

// URL situs (absolut) untuk <loc> & baris Sitemap. Ambil dari env, lalu .env.
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

// Kumpulkan semua file .html di dalam dist/ (rekursif).
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

// dist/index.html -> "/", dist/menu.html -> "/menu",
// dist/product/<id>.html -> "/product/<id>"
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
const robotsLines = [
  'User-agent: *',
  // halaman privat/interaktif: jangan diindeks
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
