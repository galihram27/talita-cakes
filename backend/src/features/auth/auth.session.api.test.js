import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { loadApp } from "../../test-helpers/api.js";

// Tabel refresh token ditiru di memori, sisanya (service, controller, cookie)
// berjalan apa adanya. Dengan begitu bisa dibuktikan token benar-benar
// dicabut, bukan hanya cookie-nya yang dihapus.
const db = vi.hoisted(() => ({ user: null, tokens: [], nextId: 1 }));

vi.mock("./auth.repository.js", async (importOriginal) => ({
   ...(await importOriginal()),
   getUserByEmail: vi.fn(async (email) =>
      email === db.user.email ? db.user : null
   ),
   createRefreshToken: vi.fn(async (data) => {
      const row = { id: `rt-${db.nextId++}`, ...data };
      db.tokens.push(row);
      return row;
   }),
   findRefreshTokensByUserId: vi.fn(async (userId) =>
      db.tokens
         .filter((t) => t.userId === userId)
         .map((t) => ({ ...t, user: db.user }))
   ),
   deleteRefreshToken: vi.fn(async (id) => {
      db.tokens = db.tokens.filter((t) => t.id !== id);
   }),
}));

const EMAIL = "siti@example.com";
const PASSWORD = "rahasia1";
const NEW_PATH = "/api/auth";
const LEGACY_PATH = "/api/auth/refresh-token";
let app;

beforeAll(async () => {
   app = await loadApp();
   db.user = {
      id: "user-1",
      name: "Siti Aminah",
      email: EMAIL,
      phone: "081234567890",
      role: "USER",
      isVerified: true,
      password: await bcrypt.hash(PASSWORD, 4),
   };
});

beforeEach(() => {
   db.tokens = [];
   vi.useRealTimers();
});

// JWT yang dibuat di detik yang sama untuk pengguna yang sama isinya
// identik. Waktu dimajukan supaya token hasil rotasi pasti berbeda dari
// token sebelumnya.
const nextSecond = () => {
   vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2000 });
};

/**
 * Peramban tiruan yang menyimpan cookie mengikuti aturan RFC 6265: cookie
 * dibedakan per nama DAN path, dan hanya dikirim ke alamat di bawah
 * path-nya, yang path-nya lebih panjang dikirim lebih dulu.
 *
 * Cookie jar bawaan supertest (`request.agent`) tidak dipakai. Ia menganggap
 * cookie di /api/auth dan perintah hapus di /api/auth/refresh-token sebagai
 * cookie yang sama, sehingga menghapus cookie lama ikut membuang cookie baru.
 * Peramban sungguhan tidak begitu.
 */
const browser = () => {
   const jar = new Map();

   const pathMatches = (url, path) =>
      url === path || url.startsWith(path.endsWith("/") ? path : `${path}/`);

   const store = (res) => {
      for (const header of res.headers["set-cookie"] ?? []) {
         const [pair, ...attrs] = header.split(/;\s*/);
         const [name, value] = pair.split("=");
         const path = attrs.find((a) => /^path=/i.test(a))?.slice(5) ?? "/";
         const expires = attrs.find((a) => /^expires=/i.test(a))?.slice(8);
         const key = `${name}|${path}`;
         if (expires && new Date(expires) <= new Date()) jar.delete(key);
         else jar.set(key, { name, value, path });
      }
   };

   const cookiesFor = (url) =>
      [...jar.values()]
         .filter((c) => pathMatches(url, c.path))
         .sort((a, b) => b.path.length - a.path.length);

   return {
      setCookie: (name, value, path) =>
         jar.set(`${name}|${path}`, { name, value, path }),
      cookie: (path) => jar.get(`refreshToken|${path}`)?.value,
      cookiesFor,
      post: async (url, body) => {
         const header = cookiesFor(url)
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");
         const req = request(app).post(url);
         if (header) req.set("Cookie", header);
         const res = await req.send(body);
         store(res);
         return res;
      },
   };
};

const login = async (b = browser()) => {
   const res = await b.post("/api/auth/login", {
      email: EMAIL,
      password: PASSWORD,
   });
   expect(res.status).toBe(200);
   return b;
};

describe("cookie refresh token", () => {
   it("dipasang di path /api/auth sebagai HttpOnly", async () => {
      const b = browser();
      const res = await b.post("/api/auth/login", {
         email: EMAIL,
         password: PASSWORD,
      });

      expect(res.headers["set-cookie"]).toContainEqual(
         expect.stringMatching(
            /^refreshToken=[^;]+;.*Path=\/api\/auth;.*HttpOnly/
         )
      );
      expect(b.cookie(NEW_PATH)).toBeDefined();
   });

   it("ikut terkirim ke logout dan refresh-token", async () => {
      const b = await login();

      expect(b.cookiesFor("/api/auth/logout")).toHaveLength(1);
      expect(b.cookiesFor("/api/auth/refresh-token")).toHaveLength(1);
   });

   it("tidak terkirim ke endpoint di luar /api/auth", async () => {
      const b = await login();

      expect(b.cookiesFor("/api/carts")).toHaveLength(0);
      expect(b.cookiesFor("/api/authors")).toHaveLength(0);
   });
});

describe("logout mencabut refresh token", () => {
   it("token di basis data terhapus saat logout", async () => {
      const b = await login();
      expect(db.tokens).toHaveLength(1);

      const res = await b.post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(db.tokens).toHaveLength(0);
      expect(b.cookie(NEW_PATH)).toBeUndefined();
   });

   // Inti masalahnya: token yang sempat tercuri tidak boleh bisa dipakai
   // lagi setelah pemiliknya logout.
   it("token yang disalin sebelum logout ditolak setelah logout", async () => {
      const b = await login();
      const stolen = b.cookie(NEW_PATH);
      await b.post("/api/auth/logout");

      const res = await request(app)
         .post("/api/auth/refresh-token")
         .set("Cookie", `refreshToken=${stolen}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid refresh token");
   });

   it("token hasil rotasi juga ikut dicabut saat logout", async () => {
      const b = await login();
      nextSecond();
      expect((await b.post("/api/auth/refresh-token")).status).toBe(200);
      expect(db.tokens).toHaveLength(1);

      await b.post("/api/auth/logout");

      expect(db.tokens).toHaveLength(0);
   });
});

describe("peralihan dari cookie di path lama", () => {
   // Pembeli yang login sebelum perubahan ini hanya punya cookie di path
   // lama, dan peramban tetap mengirimnya ke /api/auth/refresh-token.
   const legacyBrowser = async () => {
      const b = await login();
      const token = b.cookie(NEW_PATH);
      const legacy = browser();
      legacy.setCookie("refreshToken", token, LEGACY_PATH);
      return legacy;
   };

   it("refresh pertama berhasil dan memindahkan cookie ke path baru", async () => {
      const b = await legacyBrowser();
      nextSecond();

      const res = await b.post("/api/auth/refresh-token");

      expect(res.status).toBe(200);
      expect(b.cookie(NEW_PATH)).toBeDefined();
      expect(b.cookie(LEGACY_PATH)).toBeUndefined();
   });

   // Tanpa penghapusan cookie lama, peramban akan mengirim dua cookie
   // refreshToken dan yang lama (sudah dicabut saat rotasi) terbaca lebih
   // dulu, sehingga pembeli tiba-tiba keluar pada refresh berikutnya.
   it("refresh berikutnya tetap berhasil", async () => {
      const b = await legacyBrowser();
      nextSecond();
      await b.post("/api/auth/refresh-token");
      nextSecond();

      const res = await b.post("/api/auth/refresh-token");

      expect(res.status).toBe(200);
   });

   it("setelah dipindahkan, logout mencabut tokennya", async () => {
      const b = await legacyBrowser();
      nextSecond();
      await b.post("/api/auth/refresh-token");
      expect(db.tokens).toHaveLength(1);

      await b.post("/api/auth/logout");

      expect(db.tokens).toHaveLength(0);
   });
});
