<div align="center">

# 🍰 Talita's Cake & Cupcakes

**A production e-commerce platform for a home bakery in Depok, Indonesia — serving real customers, real orders, and a real revenue stream.**

[![Live Site](https://img.shields.io/badge/Live_Demo-talita--cakes.vercel.app-ff5c8d?style=for-the-badge)](https://talita-cakes.vercel.app)
[![Vue 3](https://img.shields.io/badge/Vue_3-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📖 About the Project

Most small Indonesian bakeries sell through WhatsApp alone. Orders arrive as
free-form chat messages, prices are quoted by hand, delivery fees are guessed,
and the shop has no catalogue a search engine can find. Mistakes are frequent and
every order costs the owner time.

**Talita's Cake & Cupcakes** replaces that workflow with a full storefront while
keeping the channel customers already trust. Buyers browse a structured
catalogue, configure a cake, and check out with a server-calculated total and
delivery fee. The order is persisted, then the buyer is handed off to WhatsApp
with a pre-composed message containing every detail — so the conversation the
owner is used to still happens, but starts from accurate, already-agreed numbers.

**Why it matters**

| Before | After |
| --- | --- |
| Prices quoted manually per chat | Server-authoritative pricing, never trusted from the client |
| Delivery fee estimated by feel | Real motorcycle routing distance from store coordinates |
| No catalogue, invisible to search | Pre-rendered HTML per product, sitemap, rich results |
| Order history lives in a chat log | Persisted orders, admin dashboard, visitor analytics |

This is not a tutorial clone. It is a two-app system running in production
(Render + Vercel), designed around one shop owner's actual operating constraints.

---

## 🛠 Built With

| Layer | Technology |
| --- | --- |
| **Frontend** | Vue 3 (Composition API), Vite 8, `vite-ssg` static pre-render, Pinia, Vue Router, Vue I18n, Tailwind CSS 4 |
| **Backend** | Node.js 20+, Express 5, layered feature architecture |
| **Database** | PostgreSQL via Prisma 7 (migrations + seeding) |
| **Auth** | JWT access/refresh pair, bcrypt, httpOnly cookies, email OTP |
| **Validation** | Zod (server), VeeValidate + Zod (client) |
| **Integrations** | Cloudinary (media), Resend (transactional email), HERE Routing API (distance), MapLibre GL + MapTiler (address picker), Chart.js (analytics) |
| **Infrastructure** | Render (API), Vercel (static frontend), deploy hooks for content-triggered rebuilds |

---

## ✨ Key Features

**🧁 Six-variant product configurator**
The catalogue models six structurally different product types — from fixed SKUs,
to fully configurable cakes (shape, size, flavour, design reference), to cupcake
boxes priced by box contents. Option rules are declared once per side and kept in
lockstep between API and UI, so an admin can never publish a combination the
server would later reject.

**🔒 Server-authoritative pricing & shipping**
The browser computes prices for display only. Every total — item price, discount,
and delivery fee — is recomputed server-side at cart and order time. Shipping is
derived from real motorcycle routing distance (HERE Routing API) between store
and customer coordinates, with a straight-line fallback when that service is
unavailable.

**⚡ SEO-grade static pre-rendering with live content**
Public pages, including every product detail page, are rendered to HTML at build
time so crawlers and WhatsApp link previews receive complete markup. Because
admin edits would otherwise go stale in that HTML, the backend fires a debounced
deploy hook whenever products or gallery items change — automatic rebuilds, no
manual redeploys.

**📊 Admin console with analytics**
Role-guarded admin area for products, gallery, orders, and visitor statistics.
Admin accounts cannot be created through public registration; the first one is
provisioned through a repeatable Prisma seed.

**🌐 Fully bilingual (ID/EN)**
Every string lives in locale modules with enforced key parity between languages,
including a dedicated plain-language copy file the shop owner can edit without
touching application code.

---

## 📸 Screenshots

<div align="center">

![Talita's Cake & Cupcakes — homepage](docs/assets/tampilan-utama.jpg)

_Homepage. Live at **[talita-cakes.vercel.app](https://talita-cakes.vercel.app)**._

</div>

> _More captures (product configurator, checkout map, admin analytics) to follow._

---

## 🧩 Challenges & Solutions

**The hardest problem: keeping a pre-rendered site both fast and fresh.**

`vite-ssg` renders public pages to static HTML at build time, which is what makes
the catalogue indexable and gives WhatsApp link previews real titles and images.
But static HTML is a snapshot: the moment the owner added a product from the
admin panel, the generated files were out of date — and manually redeploying
after every edit is not a workflow a non-technical user will ever follow.

The fix was a two-track content strategy. Ordinary visitors always see live data,
because the hydrated app fetches from the API right after load — nothing is ever
stale for a human. For crawlers, the backend detects product and gallery
mutations and triggers a **debounced deploy hook** (default two minutes), so a
burst of admin edits collapses into a single rebuild instead of a queue of them.

A subtler trap surfaced in production: the SPA fallback rewrite on Vercel pointed
at `/index.html`, which — with `cleanUrls` enabled — is itself a 308 redirect to
`/`. Rewrites do not follow redirects, so every route without a pre-rendered file
(cart, checkout, admin, newly added products) returned a hard 404. Pointing the
rewrite at `/` restored them, and the failure mode is now documented in the repo
so it cannot silently return.

---

## 🚀 Getting Started

**Prerequisites** — Node.js 20+ (developed on v24), a PostgreSQL database, and
accounts for Cloudinary and Resend.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # fill in the values
npx prisma migrate dev        # create the schema
npx prisma db seed            # provision the first admin (needs ADMIN_* vars)
npm run dev                   # → http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_BASE_URL=http://localhost:5000/api
npm run dev                   # → http://localhost:5173
```

### 3. Verify the production build

```bash
cd frontend
npm run build                 # static pre-render + sitemap.xml + robots.txt
```

> The API must be reachable during a production build — pre-rendering fetches the
> catalogue in order to generate product pages.

Required environment variables are documented in the `.env.example` file of each
app, which is kept in sync with the variables the code actually reads.

---

## 👤 Contact

**Galih Ramadhan** — Full-Stack Web Developer

[![GitHub](https://img.shields.io/badge/GitHub-galihram27-181717?style=flat-square&logo=github)](https://github.com/galihram27)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/YOUR-LINKEDIN-HANDLE)
[![Email](https://img.shields.io/badge/Email-galihramadhan5678@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:galihramadhan5678@gmail.com)

**Project link:** [github.com/galihram27/talita-cakes](https://github.com/galihram27/talita-cakes)

<div align="center">
<sub>Built and maintained for a real bakery. ⭐ Star the repo if it was useful to you.</sub>
</div>
