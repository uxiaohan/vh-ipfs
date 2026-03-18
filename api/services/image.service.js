import fs from "node:fs";
import path from "node:path";
import { DEFAULT_GATEWAYS } from "./constants.js";

export class ImageService {
  constructor(db, uploadDir) {
    this.db = db;
    this.uploadDir = uploadDir;
  }

  listImages(search = "", page = 1, pageSize = 20) {
    const baseQuery = "FROM images";
    const whereClause = search 
      ? `${baseQuery} WHERE original_name LIKE ? OR cid LIKE ? OR uploader_ip LIKE ?`
      : baseQuery;
    
    const searchPattern = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const countQuery = `SELECT COUNT(*) as total ${whereClause}`;
    const { total } = this.db.prepare(countQuery).get(...searchPattern);
    
    const offset = (page - 1) * pageSize;
    const dataQuery = `SELECT * ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(dataQuery).all(...searchPattern, pageSize, offset);
    
    return {
      data: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    };
  }

  getImageById(id) {
    return this.db.prepare("SELECT * FROM images WHERE id = ?").get(id);
  }

  insertImage(row) {
    const stmt = this.db.prepare(`
      INSERT INTO images (cid, filename, original_name, mime_type, size_bytes, stored_path, created_at, uploader_ip, uploader_ua, uploader_browser, uploader_os, uploader_device, pin_status, access_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      row.cid, row.filename, row.original_name, row.mime_type, row.size_bytes,
      row.stored_path, row.created_at, row.uploader_ip, row.uploader_ua,
      row.uploader_browser, row.uploader_os, row.uploader_device, row.pin_status, row.access_path
    ).lastInsertRowid;
  }

  deleteImageById(id) {
    const row = this.db.prepare("SELECT stored_path FROM images WHERE id = ?").get(id);
    if (!row) return false;
    
    if (row.stored_path && fs.existsSync(row.stored_path)) {
      fs.unlinkSync(row.stored_path);
    }
    this.db.prepare("DELETE FROM images WHERE id = ?").run(id);
    return true;
  }

  updateAccess(id) {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE images SET last_accessed = ?, access_count = access_count + 1 WHERE id = ?")
      .run(now, id);
  }

  updateAccessByCid(cid) {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE images SET last_accessed = ?, access_count = access_count + 1 WHERE cid = ?")
      .run(now, cid);
  }

  updateAccessByAccessPath(accessPath) {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE images SET last_accessed = ?, access_count = access_count + 1 WHERE access_path = ?")
      .run(now, accessPath);
  }

  getPublicGateways() {
    this.ensureSettingsTable();
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'public_gateways'").get();
    if (!row) return DEFAULT_GATEWAYS;
    try {
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GATEWAYS;
    } catch {
      return DEFAULT_GATEWAYS;
    }
  }

  setPublicGateways(gateways) {
    this.ensureSettingsTable();
    this.db.prepare("INSERT INTO settings (key, value) VALUES ('public_gateways', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(JSON.stringify(gateways));
  }

  getPublicGatewayUrl() {
    const gateways = this.getPublicGateways();
    let url = gateways[0]?.url ?? DEFAULT_GATEWAYS[0].url;
    url = url.replace('/{CID}', '').replace(/\/ipfs$/, '');
    return url;
  }

  mapImageRow(row) {
    return {
      ...row,
      ipfs_url: `${this.getPublicGatewayUrl()}/${row.cid}`,
      local_url: `/files/${row.access_path}`
    };
  }

  ensureSettingsTable() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  }
}