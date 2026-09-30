import { describe, it, expect, beforeEach, vi } from "vitest";
import {
   getAllGalleries,
   getGalleryById,
   createGalleryItem,
   updateGalleryItem,
   deleteGalleryItem,
} from "./gallery.service.js";
import * as galleryRepository from "./gallery.repository.js";
import { triggerRebuild } from "../../utils/deployHook.js";
import { cacheDeleteByPrefix } from "../../lib/cache.js";

vi.mock("./gallery.repository.js");
// Build ulang situs memanggil layanan hosting; di test cukup dicatat.
vi.mock("../../utils/deployHook.js");

const photo = {
   id: "gal-1",
   title: "Kue Ulang Tahun Kuromi",
   imageUrl: "https://res.cloudinary.com/talita/image/upload/v1/kuromi.jpg",
   tags: ["ulang tahun", "custom"],
};

beforeEach(() => {
   vi.resetAllMocks();
   // Cache asli dipakai supaya pembersihannya ikut teruji. Isinya bertahan
   // antar test, jadi dikosongkan dulu.
   cacheDeleteByPrefix("");
   galleryRepository.findAllGalleries.mockResolvedValue({
      data: [photo],
      total: 1,
   });
   galleryRepository.findGalleryById.mockResolvedValue(photo);
   galleryRepository.createGallery.mockImplementation(async (data) => data);
   galleryRepository.updateGallery.mockImplementation(async (id, data) => ({
      id,
      ...data,
   }));
});

describe("merapikan tags", () => {
   const savedTags = () =>
      galleryRepository.createGallery.mock.calls[0][0].tags;

   it("teks dipisah koma menjadi daftar", async () => {
      await createGalleryItem({ ...photo, tags: "ulang tahun,custom" });
      expect(savedTags()).toEqual(["ulang tahun", "custom"]);
   });

   it("membuang spasi berlebih dan isi kosong", async () => {
      await createGalleryItem({ ...photo, tags: " ulang tahun , , custom ," });
      expect(savedTags()).toEqual(["ulang tahun", "custom"]);
   });

   it("daftar juga dirapikan dengan aturan yang sama", async () => {
      await createGalleryItem({
         ...photo,
         tags: [" ulang tahun ", "", "custom"],
      });
      expect(savedTags()).toEqual(["ulang tahun", "custom"]);
   });

   it("tanpa tags menjadi daftar kosong", async () => {
      const { tags, ...noTags } = photo;
      await createGalleryItem(noTags);
      expect(savedTags()).toEqual([]);
   });

   it("saat update, tags yang tidak dikirim tidak ikut tertimpa", async () => {
      await updateGalleryItem("gal-1", { title: "Judul Baru" });
      expect(galleryRepository.updateGallery).toHaveBeenCalledWith("gal-1", {
         title: "Judul Baru",
      });
   });

   it("saat update, tags yang dikirim ikut dirapikan", async () => {
      await updateGalleryItem("gal-1", { tags: "wisuda, custom" });
      expect(galleryRepository.updateGallery).toHaveBeenCalledWith("gal-1", {
         tags: ["wisuda", "custom"],
      });
   });
});

describe("getAllGalleries: pembatasan halaman", () => {
   const query = () => galleryRepository.findAllGalleries.mock.calls[0][0];

   it("bawaannya halaman 1 berisi 10 foto", async () => {
      await getAllGalleries();
      expect(query()).toEqual({ search: "", skip: 0, take: 10 });
   });

   it("menghitung posisi awal dari nomor halaman", async () => {
      await getAllGalleries({ page: 3, limit: 12 });
      expect(query()).toMatchObject({ skip: 24, take: 12 });
   });

   it("membatasi maksimal 100 foto per halaman", async () => {
      await getAllGalleries({ limit: 5000 });
      expect(query().take).toBe(100);
   });

   it("halaman di bawah 1 dianggap halaman 1", async () => {
      await getAllGalleries({ page: -4 });
      expect(query().skip).toBe(0);
   });

   it("angka yang tidak bisa dibaca memakai nilai bawaan", async () => {
      await getAllGalleries({ page: "abc", limit: "xyz" });
      expect(query()).toMatchObject({ skip: 0, take: 10 });
   });

   it("menyertakan informasi halaman", async () => {
      galleryRepository.findAllGalleries.mockResolvedValue({
         data: [photo],
         total: 25,
      });
      const result = await getAllGalleries({ page: 2, limit: 10 });
      expect(result.meta).toEqual({
         total: 25,
         page: 2,
         limit: 10,
         totalPages: 3,
      });
   });
});

describe("cache dan build ulang", () => {
   it("pembacaan kedua memakai cache", async () => {
      await getAllGalleries();
      await getAllGalleries();
      expect(galleryRepository.findAllGalleries).toHaveBeenCalledTimes(1);
   });

   it("halaman berbeda punya cache sendiri", async () => {
      await getAllGalleries({ page: 1 });
      await getAllGalleries({ page: 2 });
      expect(galleryRepository.findAllGalleries).toHaveBeenCalledTimes(2);
   });

   it.each([
      ["menambah", () => createGalleryItem(photo)],
      ["mengubah", () => updateGalleryItem("gal-1", { title: "Baru" })],
      ["menghapus", () => deleteGalleryItem("gal-1")],
   ])("%s foto membersihkan cache daftar", async (_, change) => {
      await getAllGalleries();
      await change();
      await getAllGalleries();
      expect(galleryRepository.findAllGalleries).toHaveBeenCalledTimes(2);
   });

   it.each([
      ["menambah", () => createGalleryItem(photo)],
      ["mengubah", () => updateGalleryItem("gal-1", { title: "Baru" })],
      ["menghapus", () => deleteGalleryItem("gal-1")],
   ])("%s foto memicu build ulang situs", async (_, change) => {
      await change();
      expect(triggerRebuild).toHaveBeenCalledWith("gallery changed");
   });

   it("mengubah foto juga membersihkan cache detailnya", async () => {
      await getGalleryById("gal-1");
      await updateGalleryItem("gal-1", { title: "Baru" });
      galleryRepository.findGalleryById.mockClear();

      await getGalleryById("gal-1");

      expect(galleryRepository.findGalleryById).toHaveBeenCalledTimes(1);
   });
});

describe("foto yang tidak ada", () => {
   beforeEach(() => {
      galleryRepository.findGalleryById.mockResolvedValue(null);
   });

   it("detail dijawab 404", async () => {
      await expect(getGalleryById("gal-x")).rejects.toMatchObject({
         statusCode: 404,
         message: "Gallery not found",
      });
   });

   it("tidak bisa diubah dan tidak memicu build ulang", async () => {
      await expect(
         updateGalleryItem("gal-x", { title: "Baru" })
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(galleryRepository.updateGallery).not.toHaveBeenCalled();
      expect(triggerRebuild).not.toHaveBeenCalled();
   });

   it("tidak bisa dihapus", async () => {
      await expect(deleteGalleryItem("gal-x")).rejects.toMatchObject({
         statusCode: 404,
      });
      expect(galleryRepository.deleteGallery).not.toHaveBeenCalled();
   });
});
