import fs from "node:fs";
import path from "node:path";
import { MAX_LOCAL_FRACTION } from "./constants.js";

export class StorageService {
  constructor(db, uploadDir, dataDir) {
    this.db = db;
    this.uploadDir = uploadDir;
    this.dataDir = dataDir;
  }

  getTotalLocalBytes() {
    try {
      if (!fs.existsSync(this.uploadDir)) return 0;
      
      return fs.readdirSync(this.uploadDir)
        .reduce((total, file) => {
          const stat = fs.statSync(path.join(this.uploadDir, file));
          return total + (stat.isFile() ? stat.size : 0);
        }, 0);
    } catch {
      return 0;
    }
  }

  getDbStorageLimit() {
    this.ensureSettingsTable();
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'max_local_bytes'").get();
    if (!row) return null;
    
    const num = Number(row.value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  setDbStorageLimit(bytes) {
    this.ensureSettingsTable();
    this.db.prepare("INSERT INTO settings (key, value) VALUES ('max_local_bytes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(String(bytes));
  }

  getLocalLimitBytes() {
    try {
      const dbLimit = this.getDbStorageLimit();
      if (dbLimit) return dbLimit;

      try {
        const { blocks, bsize, bavail } = fs.statfsSync(this.dataDir);
        const freeBytes = bavail * bsize;
        const fraction = Math.min(Math.max(MAX_LOCAL_FRACTION, 0.1), 0.95);
        return Math.max(Math.floor(freeBytes * fraction), 512 * 1024 * 1024);
      } catch {
        return 1024 * 1024 * 1024;
      }
    } catch {
      return 1024 * 1024 * 1024;
    }
  }

  getFsInfo() {
    try {
      const { blocks, bsize, bavail } = fs.statfsSync(this.dataDir);
      return { total: blocks * bsize, free: bavail * bsize };
    } catch {
      return { total: null, free: null };
    }
  }

  cleanupByStorageLimit() {
    const maxBytes = this.getLocalLimitBytes();
    let total = this.getTotalLocalBytes();
    if (total <= maxBytes) return;

    const rows = this.db.prepare(`
      SELECT id, stored_path, size_bytes, access_count, created_at FROM images 
      ORDER BY (access_count * 0.3 + created_at * 0.7) ASC
    `).all();

    for (const row of rows) {
      if (total <= maxBytes) break;
      
      if (row.access_count > 5) continue;
      
      if (row.stored_path && fs.existsSync(row.stored_path)) {
        fs.unlinkSync(row.stored_path);
        total -= row.size_bytes;
      }
      this.db.prepare("DELETE FROM images WHERE id = ?").run(row.id);
    }
  }

  ensureSettingsTable() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  }
}