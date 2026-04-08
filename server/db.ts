import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// DB_PATH wird von Electron gesetzt (userData), sonst lokale data.db
const dbPath = process.env.DB_PATH || path.resolve("data.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    business TEXT NOT NULL,
    status TEXT NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'money',
    gross REAL NOT NULL DEFAULT 0,
    minutes REAL NOT NULL DEFAULT 0,
    minute_rate REAL NOT NULL DEFAULT 0.1,
    inps REAL NOT NULL DEFAULT 25,
    tax REAL NOT NULL DEFAULT 15,
    note TEXT NOT NULL DEFAULT '',
    net REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monthly_goal REAL NOT NULL DEFAULT 3000,
    default_inps REAL NOT NULL DEFAULT 25,
    default_tax REAL NOT NULL DEFAULT 15,
    default_minute_rate REAL NOT NULL DEFAULT 0.1
  );
`);
