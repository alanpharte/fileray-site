import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cachedScansTable = pgTable("cached_scans", {
  id: serial("id").primaryKey(),
  scanType: text("scan_type").notNull(),
  data: jsonb("data").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCachedScanSchema = createInsertSchema(cachedScansTable).omit({ id: true, scannedAt: true });
export type InsertCachedScan = z.infer<typeof insertCachedScanSchema>;
export type CachedScan = typeof cachedScansTable.$inferSelect;
