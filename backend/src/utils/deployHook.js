// src/utils/deployHook.js
// Memicu rebuild situs statis (SSG) saat data publik berubah, mis. produk atau
// gallery. Karena halaman diprerender saat build, konten baru butuh rebuild agar
// masuk ke HTML (untuk SEO). Untuk user biasa, perubahan tetap langsung terlihat
// via SPA — rebuild hanya memperbarui versi HTML statis untuk crawler.
//
// Diaktifkan hanya kalau DEPLOY_HOOK_URL di-set (build hook dari Netlify/Vercel/
// Render/Cloudflare). Rebuild di-DEBOUNCE supaya banyak perubahan beruntun hanya
// memicu SATU build (hemat build minutes).

const DEBOUNCE_MS = Number(process.env.DEPLOY_HOOK_DEBOUNCE_MS) || 120000; // default 2 menit

let timer = null;
let pending = false;

export const triggerRebuild = (reason = 'content changed') => {
  const url = process.env.DEPLOY_HOOK_URL;
  if (!url) return; // fitur mati kalau tidak dikonfigurasi

  pending = true;
  // Sudah ada rebuild terjadwal dalam window ini → cukup tandai pending,
  // jangan reset timer (throttle: maksimal 1 build per DEBOUNCE_MS).
  if (timer) return;

  timer = setTimeout(async () => {
    timer = null;
    if (!pending) return;
    pending = false;
    try {
      await fetch(url, { method: 'POST' });
      console.log(`[deploy] rebuild hook dipicu (${reason})`);
    } catch (err) {
      console.warn(`[deploy] gagal memicu rebuild: ${err.message}`);
    }
  }, DEBOUNCE_MS);
};
