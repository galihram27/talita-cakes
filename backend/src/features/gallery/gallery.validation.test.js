import { describe, it, expect } from "vitest";
import {
   createGallerySchema,
   updateGallerySchema,
   getGalleriesQuerySchema,
} from "./gallery.validation.js";

const valid = {
   title: "Kue Ulang Tahun Kuromi",
   imageUrl: "https://res.cloudinary.com/talita/image/upload/v1/kuromi.jpg",
   description: "Custom figurine",
   tags: "ulang tahun,custom",
   order: 1,
};

const messagesOf = (result) => result.error.issues.map((i) => i.message);

describe("createGallerySchema", () => {
   it("menerima foto yang lengkap", () => {
      expect(createGallerySchema.safeParse(valid).success).toBe(true);
   });

   it("cukup judul dan URL gambar", () => {
      expect(
         createGallerySchema.safeParse({
            title: valid.title,
            imageUrl: valid.imageUrl,
         }).success
      ).toBe(true);
   });

   it("menerima tags berupa daftar", () => {
      expect(
         createGallerySchema.safeParse({ ...valid, tags: ["custom"] }).success
      ).toBe(true);
   });

   it("menolak tags selain teks atau daftar teks", () => {
      expect(createGallerySchema.safeParse({ ...valid, tags: 5 }).success).toBe(
         false
      );
      expect(
         createGallerySchema.safeParse({ ...valid, tags: [1, 2] }).success
      ).toBe(false);
   });

   it("menolak tanpa judul", () => {
      const result = createGallerySchema.safeParse({ ...valid, title: "" });
      expect(messagesOf(result)).toContain("Title is required");
   });

   it("menolak URL gambar yang tidak sah", () => {
      const result = createGallerySchema.safeParse({
         ...valid,
         imageUrl: "kuromi.jpg",
      });
      expect(messagesOf(result)).toContain("Invalid image URL");
   });

   it("menolak tanpa URL gambar", () => {
      const { imageUrl, ...noImage } = valid;
      expect(createGallerySchema.safeParse(noImage).success).toBe(false);
   });

   it("mengubah urutan berbentuk teks menjadi angka", () => {
      expect(
         createGallerySchema.safeParse({ ...valid, order: "3" }).data.order
      ).toBe(3);
   });

   it("menolak urutan desimal", () => {
      expect(
         createGallerySchema.safeParse({ ...valid, order: 1.5 }).success
      ).toBe(false);
   });
});

describe("updateGallerySchema", () => {
   it("menerima satu field saja", () => {
      expect(updateGallerySchema.safeParse({ title: "Baru" }).success).toBe(
         true
      );
   });

   it("menolak data kosong", () => {
      const result = updateGallerySchema.safeParse({});
      expect(messagesOf(result)).toContain(
         "At least one field must be provided"
      );
   });

   it("tetap menolak URL gambar yang tidak sah", () => {
      expect(
         updateGallerySchema.safeParse({ imageUrl: "bukan-url" }).success
      ).toBe(false);
   });
});

describe("getGalleriesQuerySchema", () => {
   it("mengubah page dan limit dari teks menjadi angka", () => {
      expect(
         getGalleriesQuerySchema.safeParse({ page: "2", limit: "20" }).data
      ).toEqual({ page: 2, limit: 20 });
   });

   it("menolak limit lebih dari 100", () => {
      expect(getGalleriesQuerySchema.safeParse({ limit: "101" }).success).toBe(
         false
      );
   });

   it("menolak page 0", () => {
      expect(getGalleriesQuerySchema.safeParse({ page: "0" }).success).toBe(
         false
      );
   });

   it("boleh kosong", () => {
      expect(getGalleriesQuerySchema.safeParse({}).success).toBe(true);
   });
});
