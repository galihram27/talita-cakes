import { describe, it, expect } from "vitest";
import { isBotUserAgent, fingerprintVisitorId } from "./analytics.visitor.js";

const CHROME_WINDOWS =
   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CHROME_ANDROID =
   "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const SAFARI_IPHONE =
   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const INSTAGRAM_IN_APP =
   "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.3.12.91";

describe("isBotUserAgent", () => {
   it.each([
      ["Chrome di Windows", CHROME_WINDOWS],
      ["Chrome di Android", CHROME_ANDROID],
      ["Safari di iPhone", SAFARI_IPHONE],
      ["peramban di dalam Instagram", INSTAGRAM_IN_APP],
   ])("menghitung %s sebagai pengunjung", (_, userAgent) => {
      expect(isBotUserAgent(userAgent)).toBe(false);
   });

   it.each([
      [
         "Googlebot",
         "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      ],
      ["pratinjau tautan WhatsApp", "WhatsApp/2.23.20.0 A"],
      [
         "pratinjau tautan Facebook",
         "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      ],
      ["curl", "curl/8.4.0"],
      ["skrip Python", "python-requests/2.31.0"],
      [
         "Lighthouse",
         "Mozilla/5.0 (Linux; Android 11) Chrome/126.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
      ],
      ["Chrome tanpa tampilan", "Mozilla/5.0 HeadlessChrome/126.0.0.0"],
      ["health check Render", "Render/1.0"],
   ])("tidak menghitung %s", (_, userAgent) => {
      expect(isBotUserAgent(userAgent)).toBe(true);
   });

   it("tidak menghitung user-agent kosong", () => {
      expect(isBotUserAgent("")).toBe(true);
      expect(isBotUserAgent(undefined)).toBe(true);
   });

   it("tidak membedakan huruf besar-kecil", () => {
      expect(isBotUserAgent("MyCrawler/1.0")).toBe(true);
      expect(isBotUserAgent("BINGBOT/2.0")).toBe(true);
   });
});

describe("fingerprintVisitorId", () => {
   const request = (ip, userAgent) => ({
      ip,
      get: (header) => (header === "user-agent" ? userAgent : undefined),
   });

   it("berbentuk fp_ diikuti 32 karakter heksadesimal", () => {
      expect(fingerprintVisitorId(request("1.2.3.4", CHROME_WINDOWS))).toMatch(
         /^fp_[0-9a-f]{32}$/
      );
   });

   it("sama untuk IP dan user-agent yang sama", () => {
      expect(fingerprintVisitorId(request("1.2.3.4", CHROME_WINDOWS))).toBe(
         fingerprintVisitorId(request("1.2.3.4", CHROME_WINDOWS))
      );
   });

   it("berbeda kalau IP atau user-agent berbeda", () => {
      const base = fingerprintVisitorId(request("1.2.3.4", CHROME_WINDOWS));
      expect(fingerprintVisitorId(request("1.2.3.5", CHROME_WINDOWS))).not.toBe(
         base
      );
      expect(fingerprintVisitorId(request("1.2.3.4", SAFARI_IPHONE))).not.toBe(
         base
      );
   });

   // IP hanya disimpan dalam bentuk hash, bukan aslinya.
   it("tidak memuat IP asli", () => {
      expect(
         fingerprintVisitorId(request("103.10.20.30", CHROME_WINDOWS))
      ).not.toContain("103.10.20.30");
   });

   it("memakai alamat socket kalau req.ip kosong", () => {
      const req = {
         socket: { remoteAddress: "1.2.3.4" },
         get: () => CHROME_WINDOWS,
      };
      expect(fingerprintVisitorId(req)).toBe(
         fingerprintVisitorId(request("1.2.3.4", CHROME_WINDOWS))
      );
   });
});
