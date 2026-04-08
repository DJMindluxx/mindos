import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── ENTRIES ──────────────────────────────────────────────────────────────────
export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // ISO date string "YYYY-MM-DD"
  business: text("business").notNull(), // "Mindsound" | "Mindconsulting" | "Call-Agent"
  status: text("status").notNull(), // "bezahlt" | "offen" | "erwartet"
  entryType: text("entry_type").notNull().default("money"), // "money" | "minutes"
  gross: real("gross").notNull().default(0),
  minutes: real("minutes").notNull().default(0),
  minuteRate: real("minute_rate").notNull().default(0.1),
  inps: real("inps").notNull().default(25),
  tax: real("tax").notNull().default(15),
  note: text("note").notNull().default(""),
  // computed at insert
  net: real("net").notNull().default(0),
});

export const insertEntrySchema = createInsertSchema(entries).omit({ id: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;

// ── SETTINGS ─────────────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  monthlyGoal: real("monthly_goal").notNull().default(3000),
  defaultInps: real("default_inps").notNull().default(25),
  defaultTax: real("default_tax").notNull().default(15),
  defaultMinuteRate: real("default_minute_rate").notNull().default(0.1),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
