import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cid TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      stored_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      uploader_ip TEXT NOT NULL,
      uploader_ua TEXT NOT NULL,
      last_accessed TEXT,
      access_count INTEGER NOT NULL DEFAULT 0,
      pin_status TEXT NOT NULL DEFAULT 'local',
      remote_pin_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
    CREATE INDEX IF NOT EXISTS idx_images_access_count ON images(access_count);
    CREATE INDEX IF NOT EXISTS idx_images_last_accessed ON images(last_accessed);
  `);

  return db;
}
