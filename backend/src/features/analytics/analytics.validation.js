// src/features/analytics/analytics.validation.js
import { z } from "zod";

export const dashboardStatsQuerySchema = z.object({
   from: z.coerce.date({ message: "Parameter 'from' tidak valid" }).optional(),
   to: z.coerce.date({ message: "Parameter 'to' tidak valid" }).optional(),
   groupBy: z.enum(["day", "month"]).optional().default("day"),
});