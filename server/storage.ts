import { db } from "./db";
import { entries, settings } from "@shared/schema";
import type { Entry, InsertEntry, Settings, InsertSettings } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Entries
  getEntries(): Entry[];
  createEntry(data: InsertEntry): Entry;
  deleteEntry(id: number): void;
  clearEntries(): void;
  // Settings
  getSettings(): Settings;
  updateSettings(data: Partial<InsertSettings>): Settings;
}

export class Storage implements IStorage {
  constructor() {
    // Seed default settings if not present
    const existing = db.select().from(settings).get();
    if (!existing) {
      db.insert(settings).values({
        monthlyGoal: 3000,
        defaultInps: 25,
        defaultTax: 15,
        defaultMinuteRate: 0.1,
      }).run();
    }
  }

  getEntries(): Entry[] {
    return db.select().from(entries).orderBy(desc(entries.date)).all();
  }

  createEntry(data: InsertEntry): Entry {
    // Compute gross & net depending on entry type
    let gross = data.gross ?? 0;
    let mins = data.minutes ?? 0;
    let rate = data.minuteRate ?? 0.1;

    if (data.entryType === "minutes") {
      gross = mins * rate;
    }

    const reserveRate = ((data.inps ?? 25) + (data.tax ?? 15)) / 100;
    const net = gross * (1 - reserveRate);

    const result = db.insert(entries).values({
      ...data,
      gross,
      net,
    }).returning().get();

    return result;
  }

  deleteEntry(id: number): void {
    db.delete(entries).where(eq(entries.id, id)).run();
  }

  clearEntries(): void {
    db.delete(entries).run();
  }

  getSettings(): Settings {
    const s = db.select().from(settings).get();
    if (!s) throw new Error("Settings not found");
    return s;
  }

  updateSettings(data: Partial<InsertSettings>): Settings {
    const existing = this.getSettings();
    db.update(settings)
      .set(data)
      .where(eq(settings.id, existing.id))
      .run();
    return this.getSettings();
  }
}

export const storage = new Storage();
