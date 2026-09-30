import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;

beforeAll(async () => {
   app = await loadApp();
});

// Semua kasus di bawah ditolak sebelum Cloudinary dipanggil.
describe("POST /api/uploads/images", () => {
   it("tanpa token dijawab 401", async () => {
      const res = await request(app).post("/api/uploads/images");

      expect(res.status).toBe(401);
   });

   // Pembeli memang boleh mengunggah: gambar acuan desain untuk TYPE2 dan
   // TYPE4 dikirim lewat endpoint ini.
   it("akun pembeli diterima, lalu ditolak 400 karena tidak ada berkas", async () => {
      const res = await request(app)
         .post("/api/uploads/images")
         .set("Authorization", bearer(tokenFor("USER")));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("File gambar wajib diisi (field: image)");
   });

   it("berkas yang bukan gambar dijawab 400", async () => {
      const res = await request(app)
         .post("/api/uploads/images")
         .set("Authorization", bearer(tokenFor("USER")))
         .attach("image", Buffer.from("bukan gambar"), {
            filename: "catatan.txt",
            contentType: "text/plain",
         });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("File harus berupa gambar");
   });

   it("gambar lebih dari 5 MB dijawab 413", async () => {
      const res = await request(app)
         .post("/api/uploads/images")
         .set("Authorization", bearer(tokenFor("USER")))
         .attach("image", Buffer.alloc(5 * 1024 * 1024 + 1), {
            filename: "besar.png",
            contentType: "image/png",
         });

      expect(res.status).toBe(413);
      expect(res.body.message).toBe("Ukuran gambar maksimal 5MB.");
   });
});
