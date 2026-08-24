/**
 * Pembungkus handler async.
 *
 * Express (v5 pun) tidak menangkap Promise yang ditolak di dalam handler.
 * Tanpa pembungkus ini, setiap controller harus punya try/catch sendiri hanya
 * untuk meneruskan error ke `next()` — kalau lupa, request-nya menggantung
 * tanpa balasan sampai timeout.
 *
 * Dengan ini, `throw` di dalam controller (mis. `throw new AppError(...)`)
 * otomatis mengalir ke errorHandler. Itu sebabnya controller di proyek ini
 * bersih dari try/catch.
 */
export const asyncHandler = (fn) => (req, res, next) => {
   Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
