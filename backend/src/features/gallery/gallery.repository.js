import prisma from "../../lib/prisma.js";

// =========================
// READ
// =========================

// Ambil semua gallery dengan filter pencarian & sorting by order
// Dipakai untuk halaman gallery (user) dan halaman admin
export const findAllGalleries = async ({ search = "", skip = 0, take = 10 } = {}) => {
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

export const updateGallery = async (id, data) => {
   const updateData = {};

   if (data.title !== undefined) updateData.title = data.title;
   if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
   if (data.description !== undefined) updateData.description = data.description;
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