import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  staleThresholdDays: integer("stale_threshold_days").notNull().default(90),
  namingPattern: text("naming_pattern"),
  namingPatternDescription: text("naming_pattern_description"),
});

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable).omit({ id: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
