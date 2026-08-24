import prisma from "../../lib/prisma.js";

/**
 * Query tabel galeri. Murni akses DB — validasi, cache, dan normalisasi tags
 * ditangani gallery.service.js.
 */

// =========================
// READ
// =========================

/**
 * Ambil daftar galeri, diurutkan sesuai kolom `order` yang diatur admin.
 *
 * Ada dua jalur:
 * - Tanpa kata kunci -> query Prisma biasa.
 * - Dengan kata kunci -> raw SQL, karena pencarian juga harus menjangkau isi
 *   array `tags`. `unnest` memecah array jadi baris agar tiap tag bisa
 *   dicocokkan, dan DISTINCT mencegah satu foto muncul berkali-kali kalau
 *   beberapa tag-nya sama-sama cocok.
 *
 * Dipakai halaman galeri publik maupun halaman admin.
 */
export const findAllGalleries = async ({
   search = "",
   skip = 0,
   take = 10,
} = {}) => {
   if (!search) {
      const [data, total] = await Promise.all([
         prisma.gallery.findMany({ orderBy: { order: "asc" }, skip, take }),
         prisma.gallery.count(),
      ]);
      return { data, total };
   }

   const likePattern = `%${search}%`;

   const [data, totalResult] = await Promise.all([
      prisma.$queryRaw`
         SELECT DISTINCT g.*
         FROM "galleries" g
         LEFT JOIN LATERAL unnest(g.tags) AS tag ON true
         WHERE g.title ILIKE ${likePattern}
            OR g.description ILIKE ${likePattern}
            OR tag ILIKE ${likePattern}
         ORDER BY g."order" ASC
         OFFSET ${skip} LIMIT ${take}
      `,
      prisma.$queryRaw`
         SELECT COUNT(DISTINCT g.id)::int AS count
         FROM "galleries" g
         LEFT JOIN LATERAL unnest(g.tags) AS tag ON true
         WHERE g.title ILIKE ${likePattern}
            OR g.description ILIKE ${likePattern}
            OR tag ILIKE ${likePattern}
      `,
   ]);

   return { data, total: totalResult[0]?.count ?? 0 };
};

// Ambil 1 gallery by id
export const findGalleryById = async (id) => {
   return prisma.gallery.findUnique({
      where: { id },
   });
};

// =========================
// WRITE
// =========================

export const createGallery = async (data) => {
   return prisma.gallery.create({
      data: {
         title: data.title,
         imageUrl: data.imageUrl,
         description: data.description ?? null,
         tags: data.tags ?? [],
         order: data.order ?? 0,
      },
   });
};

/**
 * Update sebagian field. Field disalin satu per satu dan hanya kalau memang
 * dikirim, supaya field yang tidak disebut di body tidak ikut ditimpa null.
 */
export const updateGallery = async (id, data) => {
   const updateData = {};

   if (data.title !== undefined) updateData.title = data.title;
   if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
   if (data.description !== undefined)
      updateData.description = data.description;
   if (data.tags !== undefined) updateData.tags = data.tags;
   if (data.order !== undefined) updateData.order = data.order;

   return prisma.gallery.update({
      where: { id },
      data: updateData,
   });
};

export const deleteGallery = async (id) => {
   return prisma.gallery.delete({
      where: { id },
   });
};
