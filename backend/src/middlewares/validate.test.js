import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "./validate.js";
import { AppError } from "../utils/appError.js";

const schema = z.object({
   page: z.coerce.number().int().positive(),
   sort: z.enum(["asc", "desc"]).default("asc"),
});

const run = (target, input) => {
   const req = { [target]: input };
   const next = vi.fn();
   validate(schema, target)(req, {}, next);
   return { req, next };
};

describe("validate", () => {
   it("meneruskan AppError 422 kalau data rusak", () => {
      const { next } = run("body", { page: "nol" });

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe("Validasi gagal");
   });

   it("menyertakan daftar field yang gagal di details", () => {
      const { next } = run("body", { page: "nol" });
      expect(next.mock.calls[0][0].details.fieldErrors).toHaveProperty("page");
   });

   it("tidak mengubah request kalau data rusak", () => {
      const { req } = run("body", { page: "nol" });
      expect(req.body).toEqual({ page: "nol" });
   });

   it("memanggil next tanpa error kalau data sah", () => {
      const { next } = run("body", { page: "2" });
      expect(next).toHaveBeenCalledWith();
   });

   it("menulis balik body yang sudah dikonversi dan diberi nilai bawaan", () => {
      const { req } = run("body", { page: "12" });
      expect(req.body).toEqual({ page: 12, sort: "asc" });
   });

   it("membuang field yang tidak ada di skema", () => {
      const { req } = run("body", { page: "1", isAdmin: true });
      expect(req.body).not.toHaveProperty("isAdmin");
   });

   it("bawaannya memeriksa body", () => {
      const req = { body: { page: "3" } };
      validate(schema)(req, {}, vi.fn());
      expect(req.body.page).toBe(3);
   });

   it("menulis balik params", () => {
      const { req } = run("params", { page: "5" });
      expect(req.params).toEqual({ page: 5, sort: "asc" });
   });

   // Di Express 5 `req.query` hanya punya getter, jadi objeknya tidak bisa
   // diganti. Middleware harus mengisi ulang objek yang sama.
   it("mengisi ulang objek query yang sama, bukan menggantinya", () => {
      const query = { page: "7", extra: "buang" };
      const req = {};
      Object.defineProperty(req, "query", { get: () => query });

      const next = vi.fn();
      validate(schema, "query")(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query).toBe(query);
      expect(query).toEqual({ page: 7, sort: "asc" });
   });
});
