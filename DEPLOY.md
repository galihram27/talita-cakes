# Deploy — Talita's Cake (SSG frontend + Node backend)

Frontend memakai **SSG** (`vite-ssg`): halaman publik diprerender jadi HTML statis
untuk SEO, lalu di-hydrate sebagai SPA. Backend tetap Express + Prisma (Neon).

## 1. Build frontend

Prasyarat build:

- **Backend HARUS hidup & terjangkau saat build.** Saat prerender, halaman
  mengambil data lewat `VITE_API_BASE_URL` (daftar produk untuk `/product/:id`
  dan isi Menu/Home/Gallery). Kalau API mati, build tetap jalan tapi hanya
  halaman statis yang terprerender (produk jatuh ke SPA).
- Set env di host frontend:
  - `VITE_API_BASE_URL` — URL backend + `/api` (mis. `https://api-talita.onrender.com/api`)
  - `VITE_SITE_URL` — domain situs, tanpa trailing slash (mis. `https://talitascake.com`).
    Dipakai untuk canonical, Open Graph, dan `sitemap.xml`. Wajib untuk SEO yang benar.
  - (opsional) `VITE_MAPTILER_KEY`, dll — lihat `.env.example`.

```bash
cd frontend
npm ci
npm run build      # vite-ssg build + postbuild (sitemap.xml & robots.txt)
# hasil di frontend/dist/ (HTML statis + assets + sitemap.xml + robots.txt)
```

## 2. SPA fallback (WAJIB)

Rute yang **tidak** diprerender (`/cart`, `/checkout`, `/profile`, `/admin/*`,
halaman auth, dan produk baru sebelum rebuild) harus di-fallback ke `index.html`
agar dirender client-side. Halaman yang sudah diprerender tetap disajikan dari
file HTML-nya (host mengecek file lebih dulu). Config sudah disiapkan:

- **Netlify / Cloudflare Pages** → `frontend/public/_redirects` (otomatis ke `dist/`).
- **Vercel** → `frontend/vercel.json` (`cleanUrls: true` penting supaya `/menu`
  menyajikan `menu.html`, `/product/<id>` menyajikan `product/<id>.html`).
- **Render (Static Site)** → tambahkan Rewrite Rule di dashboard:
  `Source: /*  →  Destination: /index.html  (Action: Rewrite)`.
- **Nginx** →
  ```nginx
  location / { try_files $uri $uri.html $uri/index.html /index.html; }
  ```

> Kunci: file statis/HTML yang cocok disajikan lebih dulu; fallback ke
> `index.html` hanya untuk path yang tak punya file.

## 3. Auto-rebuild saat produk/gallery berubah (opsional tapi disarankan)

Karena halaman diprerender saat build, konten baru butuh rebuild agar masuk ke
HTML (untuk crawler). User biasa tetap melihat perubahan langsung via SPA.

1. Di host frontend, buat **Build/Deploy Hook** (URL rahasia yang memicu rebuild):
   - Netlify: Site settings → Build & deploy → Build hooks.
   - Vercel: Settings → Git → Deploy Hooks.
   - Cloudflare Pages / Render: fitur serupa di dashboard.
2. Set env di **backend**:
   - `DEPLOY_HOOK_URL` — URL hook tadi.
   - `DEPLOY_HOOK_DEBOUNCE_MS` — opsional, default `120000` (2 menit).
3. Backend otomatis mem-POST hook itu (di-**debounce**) tiap produk/gallery
   berubah → maksimal 1 rebuild per window (hemat build minutes).

Kalau `DEPLOY_HOOK_URL` kosong, fitur mati (aman untuk dev lokal).

## 4. Verifikasi SEO setelah deploy

- Buka "View Page Source" pada `/` dan `/product/<id>` → HTML harus sudah berisi
  konten (nama, deskripsi, harga), bukan `<div id="app"></div>` kosong.
- Cek `/{sitemap.xml}` & `/{robots.txt}` bisa diakses.
- Google **Rich Results Test** (JSON-LD Product/Bakery) & **Search Console**
  (submit sitemap).
- Tempel link produk di WhatsApp → preview (judul + gambar) harus muncul.
