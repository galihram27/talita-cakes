// Talita's Cake — shared data & helpers (prototype)
export const STORE = {
  name: "Talita's Cake & Cupcakes",
  short: "Talita's Cake",
  since: 2012,
  address: "Perumahan Sukamaju Permai Blok A No. 3, Depok Timur, Sukamaju, Cilodong, Kota Depok",
  instagram: "talitacakes",
  threads: "talitacakes",
  tiktok: "talitacakesdepok",
  whatsapp: "6281234567890",
  waDisplay: "+62 812-3456-7890",
  lat: -6.8894, lng: 107.5953,
  maxKm: 25,
  minDays: 7,
};

export const FLAVORS = [
  "Blackforest", "Double Choco Cream", "Oreo Choco",
  "Snow White Double Cheese", "Vanilla Double Cheese", "Oreo Cheese",
];

export const SHIP_TIERS = [
  { max: 5,  label: "< 5 km",   cost: 30000 },
  { max: 10, label: "5–10 km",  cost: 45000 },
  { max: 15, label: "11–15 km", cost: 55000 },
  { max: 20, label: "16–20 km", cost: 65000 },
  { max: 25, label: "21–25 km", cost: 75000 },
];

export function shipCost(km) {
  for (const t of SHIP_TIERS) if (km <= t.max) return t.cost;
  return null; // out of range
}

export function fmtRp(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, d = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * d / 2) ** 2 +
    Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin((lng2 - lng1) * d / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const TYPE_INFO = {
  1: { badge: "Shortcake Series",  hint: "Shape, size & flavor are preset — just choose the quantity." },
  2: { badge: "Petite Cake",       hint: "Shape & size are fixed. Choose a flavor and attach a decoration reference." },
  3: { badge: "Original Cake",     hint: "Our signature flavor. Just choose the shape & size you need." },
  4: { badge: "Custom Cake",       hint: "Most flexible: shape, size, flavor & design are all your choice." },
};

function ph(label) { return { src: null, noSrc: true, label }; }
function img(src, label) { return { src, noSrc: false, label }; }

function makeVariants(base, perStep, kotakExtra) {
  const out = [];
  for (const shape of ["Round", "Square"]) {
    for (let size = 16; size <= 30; size += 2) {
      let price = base + ((size - 16) / 2) * perStep;
      if (shape === "Square") price += kotakExtra;
      out.push({ shape, size, price, key: shape + "-" + size });
    }
  }
  return out;
}

export const PRODUCTS = [
  // ---- TYPE 1 — Signature Shortcake Series ----
  { id: "p1", slug: "strawberry-shortcake", type: 1, name: "Strawberry Shortcake",
    category: "Shortcake Series", price: 185000, discountPct: 10,
    desc: "Soft vanilla sponge layered with fresh cream and real strawberry slices. Round 20 cm — our signature recipe since 2012.",
    photos: [ph("photo: strawberry shortcake"), ph("photo: cake slice"), ph("photo: topping detail")] },
  { id: "p2", slug: "choco-berry-shortcake", type: 1, name: "Choco Berry Shortcake",
    category: "Shortcake Series", price: 195000, discountPct: 0,
    desc: "A blend of chocolate sponge, milk cream and mixed berries. Round 20 cm, perfectly sweet for all ages.",
    photos: [ph("photo: choco berry shortcake"), ph("photo: cake side")] },
  { id: "p3", slug: "mango-cream-shortcake", type: 1, name: "Mango Cream Shortcake",
    category: "Shortcake Series", price: 190000, discountPct: 0,
    desc: "Fragrant sweet mango over vanilla sponge and light cream. Round 20 cm. Available seasonally.",
    photos: [ph("photo: mango cream shortcake")] },

  // ---- TYPE 2 — Petite Cake ----
  { id: "p4", slug: "petite-simple-decor", type: 2, name: "Petite Cake — Simple Decor",
    category: "Simple Decor", price: 160000, discountPct: 0,
    desc: "A dainty 12 cm round cake with minimalist cream decoration. Pick your favorite flavor and send a color/style reference.",
    photos: [ph("photo: petite simple decor"), ph("photo: color variations")] },
  { id: "p5", slug: "petite-paper-topper", type: 2, name: "Petite Cake — Paper Topper",
    category: "Paper Topper", price: 175000, discountPct: 0,
    desc: "A 12 cm petite cake with a custom paper topper (name, age, or theme). Attach the topper design you'd like.",
    photos: [ph("photo: petite paper topper"), ph("photo: topper example")] },
  { id: "p6", slug: "petite-custom-2d", type: 2, name: "Petite Cake — Custom 2D",
    category: "Custom 2D", price: 195000, discountPct: 15,
    desc: "A 12 cm petite cake with 2D character/motif cream decoration. Send a reference image and we'll bring it to life on the cake.",
    photos: [ph("photo: petite custom 2d"), ph("photo: character example")] },

  // ---- TYPE 3 — Signature Original Cake ----
  { id: "p7", slug: "blackforest-original", type: 3, name: "Blackforest Original",
    category: "Original Cake", price: 210000, discountPct: 0,
    desc: "Classic blackforest: chocolate sponge, fresh cream, black cherries and chocolate shavings. Flavor is set — just choose the shape & size.",
    variants: makeVariants(210000, 25000, 20000),
    photos: [ph("photo: blackforest original"), ph("photo: layer texture")] },
  { id: "p8", slug: "oreo-cheese-original", type: 3, name: "Oreo Cheese Original",
    category: "Original Cake", price: 230000, discountPct: 0,
    desc: "Smooth cheese cream layers with Oreo crumble in every bite. Choose round or square, size 16–30 cm.",
    variants: makeVariants(230000, 25000, 20000),
    photos: [ph("photo: oreo cheese original")] },

  // ---- TYPE 4 — Signature Custom Cake ----
  { id: "p9", slug: "signature-custom-cake", type: 4, name: "Signature Custom Cake",
    category: "Custom Cake", price: 260000, discountPct: 0,
    desc: "Your dream cake, made from scratch: set the shape, size, flavor, and send a design reference. Perfect for birthdays, proposals and special moments.",
    variants: makeVariants(260000, 30000, 25000),
    photos: [img(window.__resources.galleryFlowers, "Flowers Custom Decor Cake"), ph("photo: another custom example"), ph("photo: decorating process")] },
  { id: "p10", slug: "custom-character-cake", type: 4, name: "Custom Character Cake",
    category: "Custom Cake", price: 285000, discountPct: 0,
    desc: "A custom cake focused on your favorite character (fondant/cream). Choose the shape, size, flavor, and attach the character image.",
    variants: makeVariants(285000, 30000, 25000),
    photos: [ph("photo: custom character cake"), ph("photo: character detail")] },
];

export const CATEGORIES = ["All", "Shortcake Series", "Simple Decor", "Paper Topper", "Custom 2D", "Original Cake", "Custom Cake"];

export const GALLERY = [
  { id: "g1", title: "Flowers Custom Decor Cake", desc: "A birthday custom cake with a three-dimensional cream flower bouquet.", tags: ["custom", "flowers", "birthday"], photo: img(window.__resources.galleryFlowers, "Flowers Custom Decor Cake") },
  { id: "g2", title: "Classic Blackforest 24 cm", desc: "A repeat order for a family celebration.", tags: ["original", "blackforest"], photo: ph("photo: blackforest 24cm") },
  { id: "g3", title: "Petite Paper Topper — Dinosaur", desc: "A dino-themed petite cake for a 3rd birthday.", tags: ["petite", "topper", "kids"], photo: ph("photo: petite dino") },
  { id: "g4", title: "Custom 2D — Orange Cat", desc: "A 2D cat character decorated in buttercream.", tags: ["petite", "2d", "character"], photo: ph("photo: orange cat 2d") },
  { id: "g5", title: "Rustic Cream Proposal", desc: "A two-tier custom cake in cream tones with fresh flowers.", tags: ["custom", "proposal", "elegant"], photo: ph("photo: rustic proposal") },
  { id: "g6", title: "Strawberry Shortcake Signature", desc: "Our best-seller — fresh strawberries every day.", tags: ["shortcake", "strawberry"], photo: ph("photo: shortcake signature") },
  { id: "g7", title: "Petite Simple Decor — Sage", desc: "A sage green palette with minimalist lettering.", tags: ["petite", "minimalist"], photo: ph("photo: petite sage") },
  { id: "g8", title: "Custom Number 25 — Anniversary", desc: "A number cake for a 25th wedding anniversary.", tags: ["custom", "anniversary"], photo: ph("photo: number 25 cake") },
];

export function findProduct(slug) { return PRODUCTS.find(p => p.slug === slug) || null; }
export function finalPrice(p, base) {
  const b = base != null ? base : p.price;
  return p.discountPct ? Math.round(b * (100 - p.discountPct) / 100) : b;
}

// ---------- localStorage stores ----------
const K = { cart: "tc_cart", user: "tc_user", users: "tc_users", orders: "tc_orders", visits: "tc_visits" };
function read(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

export const db = {
  getCart: () => read(K.cart, []),
  setCart: (c) => write(K.cart, c),
  getUser: () => read(K.user, null),
  setUser: (u) => write(K.user, u),
  logout: () => localStorage.removeItem(K.user),
  getUsers: () => {
    let u = read(K.users, null);
    if (!u) {
      u = [{ name: "Admin Talita", email: "admin@talitascake.id", password: "admin123", phone: "6281234567890", role: "admin", verified: true }];
      write(K.users, u);
    }
    return u;
  },
  setUsers: (u) => write(K.users, u),
  getOrders: () => read(K.orders, []),
  setOrders: (o) => write(K.orders, o),
  addOrder: (o) => { const all = read(K.orders, []); all.unshift(o); write(K.orders, all); },
  trackVisit: (page) => {
    const v = read(K.visits, []);
    v.push({ page, t: Date.now() });
    write(K.visits, v.slice(-2000));
  },
  getVisits: () => read(K.visits, []),
};

export function orderCode() {
  const d = new Date();
  return "TC" + d.getFullYear().toString().slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function minCakeDate() {
  const d = new Date(); d.setDate(d.getDate() + STORE.minDays);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function waLink(text) {
  return "https://wa.me/" + STORE.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
}

export function buildWaMessage(order) {
  const L = [];
  L.push("Hi Talita's Cake! I'd like to place an order:");
  L.push("");
  L.push("Order No.: " + order.code);
  order.items.forEach((it, i) => {
    L.push((i + 1) + ". " + it.name + " (x" + it.qty + ")");
    if (it.variant) L.push("   Shape/Size: " + it.variant.shape + " " + it.variant.size + " cm");
    if (it.flavor) L.push("   Flavor: " + it.flavor);
    if (it.ref) L.push("   Design reference: " + (it.ref.kind === "gallery" ? "Gallery — " + it.ref.title : "Own upload (attached)"));
    if (it.writing) L.push("   Writing on cake: \"" + it.writing + "\"");
    if (it.note) L.push("   Note: " + it.note);
    L.push("   Price: " + fmtRp(it.unitPrice * it.qty));
  });
  L.push("");
  L.push("Cake date: " + fmtDate(order.cakeDate));
  L.push(order.method === "pickup" ? "Pickup: Collect at the store" : "Shipping: Delivery (" + order.distanceKm.toFixed(1) + " km)");
  if (order.method === "delivery") {
    L.push("Recipient: " + order.recipient.name + " (" + order.recipient.phone + ")");
    L.push("Address: " + order.address);
    L.push("Delivery fee: " + fmtRp(order.shipping));
  }
  L.push("Subtotal: " + fmtRp(order.subtotal));
  L.push("Total: " + fmtRp(order.total));
  L.push("");
  L.push("On behalf of: " + order.userName + " (" + order.userPhone + ")");
  L.push("Please confirm, thank you!");
  return L.join("\n");
}
