import { ERROR_CODES } from "./constants.js";

export class AuthService {
  constructor(db, jwt) {
    this.db = db;
    this.jwt = jwt;
  }

  getAdminPassword() {
    this.ensureSettingsTable();
    return this.db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get()?.value ?? "";
  }

  setAdminPassword(password) {
    this.ensureSettingsTable();
    this.db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(password);
  }

  hasAdminPassword() {
    this.ensureSettingsTable();
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
    if (!row) return false;
    return row.value !== "";
  }

  getSitePassword() {
    this.ensureSettingsTable();
    return this.db.prepare("SELECT value FROM settings WHERE key = 'site_password'").get()?.value ?? "";
  }

  setSitePassword(password) {
    this.ensureSettingsTable();
    this.db.prepare("INSERT INTO settings (key, value) VALUES ('site_password', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(password);
  }

  getSitePasswordEnabled() {
    this.ensureSettingsTable();
    const enabledRow = this.db.prepare("SELECT value FROM settings WHERE key = 'site_password_enabled'").get();
    const passwordRow = this.db.prepare("SELECT value FROM settings WHERE key = 'site_password'").get();
    
    if (enabledRow && enabledRow.value === "true") {
      if (!passwordRow) return false;
      return true;
    }
    return false;
  }

  setSitePasswordEnabled(enabled) {
    this.ensureSettingsTable();
    this.db.prepare("INSERT INTO settings (key, value) VALUES ('site_password_enabled', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(enabled ? "true" : "false");
  }

  verifyAdminPassword(password) {
    const currentPassword = this.getAdminPassword();
    return password === currentPassword;
  }

  verifySitePassword(password) {
    const currentPassword = this.getSitePassword();
    if (!currentPassword) return true;
    return password === currentPassword;
  }

  generateToken(role, jwt) {
    return jwt.sign({ role });
  }

  ensureSettingsTable() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  }
}