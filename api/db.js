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

  migrateDb(db);

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
      uploader_browser TEXT,
      uploader_os TEXT,
      uploader_device TEXT,
      last_accessed TEXT,
      access_count INTEGER NOT NULL DEFAULT 0,
      pin_status TEXT NOT NULL DEFAULT 'local'
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

function migrateDb(db) {
  const tableInfo = db.prepare("PRAGMA table_info(images)").all();
  const columns = tableInfo.map(row => row.name);

  if (columns.includes('remote_pin_status')) {
    db.exec(`
      BEGIN TRANSACTION;

      CREATE TABLE images_new (
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
        uploader_browser TEXT,
        uploader_os TEXT,
        uploader_device TEXT,
        last_accessed TEXT,
        access_count INTEGER NOT NULL DEFAULT 0,
        pin_status TEXT NOT NULL DEFAULT 'local'
      );

      INSERT INTO images_new (id, cid, filename, original_name, mime_type, size_bytes, stored_path, created_at, uploader_ip, uploader_ua, last_accessed, access_count, pin_status)
      SELECT id, cid, filename, original_name, mime_type, size_bytes, stored_path, created_at, uploader_ip, uploader_ua, last_accessed, access_count, pin_status
      FROM images;

      DROP TABLE images;
      ALTER TABLE images_new RENAME TO images;

      COMMIT;
    `);
  }

  if (!columns.includes('uploader_ua')) {
    db.exec("ALTER TABLE images ADD COLUMN uploader_ua TEXT NOT NULL DEFAULT ''");
  }

  if (!columns.includes('uploader_browser')) {
    db.exec("ALTER TABLE images ADD COLUMN uploader_browser TEXT");
  }

  if (!columns.includes('uploader_os')) {
    db.exec("ALTER TABLE images ADD COLUMN uploader_os TEXT");
  }

  if (!columns.includes('uploader_device')) {
    db.exec("ALTER TABLE images ADD COLUMN uploader_device TEXT");
  }
}
