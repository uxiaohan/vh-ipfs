import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import jwt from "@fastify/jwt";
import staticPlugin from "@fastify/static";
import { create } from "ipfs-http-client";

import { initDb } from "./db.js";
import { logger, LOG_FILE } from "./logger.js";
import { AuthService } from "./services/auth.service.js";
import { StorageService } from "./services/storage.service.js";
import { ImageService } from "./services/image.service.js";
import { MAX_UPLOAD_BYTES, ERROR_CODES } from "./services/constants.js";

const {
  PORT = 16661,
  DATA_DIR = "/data",
  DB_PATH,
  IPFS_API_URL = "http://127.0.0.1:5001",
  JWT_SECRET = crypto.randomBytes(32).toString('hex')
} = process.env;

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const ACTUAL_DB_PATH = DB_PATH ?? path.join(DATA_DIR, "db.sqlite");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const db = initDb(ACTUAL_DB_PATH);
const ipfs = create({ url: IPFS_API_URL });

const authService = new AuthService(db, null);
const storageService = new StorageService(db, UPLOAD_DIR, DATA_DIR);
const imageService = new ImageService(db, UPLOAD_DIR);

const app = Fastify({ logger: true, trustProxy: true });

await app.register(jwt, { secret: JWT_SECRET, sign: { expiresIn: '7d' } });
app.decorate("authenticate", async (request, reply) => {
  await request.jwtVerify();
});

await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES } });

await app.register(staticPlugin, {
  root: path.join(process.cwd(), "public"),
  prefix: "/"
});

const nowIso = () => new Date().toISOString();
const getClientIp = (request) => request.ip ?? request.headers["x-forwarded-for"] ?? "unknown";
const isImageOrVideo = (mime) => mime?.startsWith("image/") || mime?.startsWith("video/");

app.get("/health", () => ({ ok: true }));

app.get("/api/admin/has-password", async () => {
  return { has_password: authService.hasAdminPassword() };
});

app.get("/api/site-password-enabled", async () => {
  return { enabled: authService.getSitePasswordEnabled() };
});

app.get("/api/admin/site-password-enabled", { preValidation: [app.authenticate] }, async () => {
  return { enabled: authService.getSitePasswordEnabled() };
});

app.post("/api/admin/site-password-enabled", { preValidation: [app.authenticate] }, async (request, reply) => {
  const { enabled } = request.body ?? {};
  
  if (enabled) {
    const sitePassword = authService.getSitePassword();
    if (!sitePassword) {
      return reply.code(400).send({ error: ERROR_CODES.PASSWORD_NOT_SET });
    }
  }
  
  authService.setSitePasswordEnabled(enabled);
  return { ok: true };
});

app.post("/api/site-login", async (request, reply) => {
  const sitePassword = authService.getSitePassword();
  
  if (!sitePassword) {
    const token = authService.generateToken("site", app.jwt);
    return { token };
  }
  
  const { password } = request.body ?? {};
  
  if (!authService.verifySitePassword(password)) {
    return reply.code(401).send({ error: ERROR_CODES.INVALID_PASSWORD });
  }
  
  const token = authService.generateToken("site", app.jwt);
  return { token };
});

app.get("/api/site-verify", { preValidation: [app.authenticate] }, async (request) => {
  if (request.user.role !== "site") {
    throw { code: "FST_JWT_AUTHORIZATION_TOKEN_INVALID" };
  }
  return { ok: true };
});

app.post("/api/login", async (request, reply) => {
  const currentPassword = authService.getAdminPassword();
  
  if (!currentPassword) {
    return { token: authService.generateToken("admin", app.jwt) };
  }
  
  const { password } = request.body ?? {};
  
  if (!authService.verifyAdminPassword(password)) {
    return reply.code(401).send({ error: ERROR_CODES.INVALID_PASSWORD });
  }
  return { token: authService.generateToken("admin", app.jwt) };
});

app.post("/api/upload", async (request, reply) => {
  let storedPath = null;
  
  try {
    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ error: ERROR_CODES.FILE_REQUIRED });
    }

    if (!isImageOrVideo(part.mimetype)) {
      return reply.code(400).send({ error: ERROR_CODES.ONLY_IMAGE_OR_VIDEO });
    }

    const ext = path.extname(part.filename ?? "");
    const filename = `${crypto.randomUUID()}${ext}`;
    storedPath = path.join(UPLOAD_DIR, filename);

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(storedPath);
      part.file.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    const stat = fs.statSync(storedPath);
    const { cid } = await ipfs.add(
      { content: fs.createReadStream(storedPath), path: part.filename },
      { pin: true, cidVersion: 1 }
    );

    const cidStr = cid.toString();

    const rowId = imageService.insertImage({
      cid: cidStr,
      filename,
      original_name: part.filename,
      mime_type: part.mimetype,
      size_bytes: stat.size,
      stored_path: storedPath,
      created_at: nowIso(),
      uploader_ip: getClientIp(request),
      uploader_ua: request.headers["user-agent"] ?? "",
      pin_status: "local"
    });

    storageService.cleanupByStorageLimit();

    return {
      id: rowId,
      cid: cidStr,
      original_name: part.filename,
      ipfs_url: `${imageService.getPublicGatewayUrl()}/${cidStr}`,
      local_url: `/files/${rowId}`
    };
  } catch (err) {
    if (storedPath && fs.existsSync(storedPath)) {
      fs.unlinkSync(storedPath);
    }
    app.log.error({ err }, "Upload failed");
    return reply.code(500).send({ error: "upload_failed" });
  }
});

app.get("/api/images", async (request) => {
  const limit = Math.min(Number(request.query.limit) || 10, 100);
  const rows = db.prepare(`
    SELECT id, cid, filename, original_name, mime_type, size_bytes, created_at
    FROM images ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  
  return rows.map(row => imageService.mapImageRow(row));
});

app.get("/files/:id", async (request, reply) => {
  const id = Number(request.params.id);
  const row = db.prepare("SELECT stored_path, mime_type FROM images WHERE id = ?").get(id);
  
  if (!row?.stored_path || !fs.existsSync(row.stored_path)) {
    return reply.code(404).send({ error: "not_found" });
  }
  
  imageService.updateAccess(id);
  return reply.header("content-type", row.mime_type).send(fs.createReadStream(row.stored_path));
});

app.get("/api/admin/images", { preValidation: [app.authenticate] }, async (request) => {
  const search = request.query.search ?? "";
  const page = Math.max(Number(request.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(request.query.pageSize) || 20, 1), 100);
  
  const result = imageService.listImages(search, page, pageSize);
  return {
    ...result,
    data: result.data.map(row => imageService.mapImageRow(row))
  };
});

app.delete("/api/admin/images/:id", { preValidation: [app.authenticate] }, async (request, reply) => {
  const id = Number(request.params.id);
  const ok = imageService.deleteImageById(id);
  
  if (!ok) return reply.code(404).send({ error: "not_found" });
  return { ok: true };
});

app.get("/api/admin/storage", { preValidation: [app.authenticate] }, async () => {
  const [used, limit, { free }] = [storageService.getTotalLocalBytes(), storageService.getLocalLimitBytes(), storageService.getFsInfo()];
  return { used_bytes: used, limit_bytes: limit, fs_free_bytes: free };
});

app.post("/api/admin/storage", { preValidation: [app.authenticate] }, async (request, reply) => {
  const { max_bytes } = request.body ?? {};
  const [used, { free }] = [storageService.getTotalLocalBytes(), storageService.getFsInfo()];
  const next = Number(max_bytes);
  
  if (!Number.isFinite(next) || next <= 0) {
    return reply.code(400).send({ error: "invalid_max_bytes" });
  }
  if (next < used) {
    return reply.code(400).send({ error: "below_used", used_bytes: used });
  }
  if (next > free) {
    return reply.code(400).send({ error: "exceeds_disk_free", fs_free_bytes: free });
  }
  
  storageService.setDbStorageLimit(next);
  return { ok: true, limit_bytes: next, used_bytes: used };
});

app.post("/api/admin/password", async (request, reply) => {
  const { password } = request.body ?? {};
  
  if (!password) {
    return reply.code(400).send({ error: "password_required" });
  }
  
  if (authService.hasAdminPassword()) {
    return reply.code(400).send({ error: "password_already_set" });
  }
  
  if (password.length < 6) {
    return reply.code(400).send({ error: "password_too_short" });
  }
  
  authService.setAdminPassword(password);
  return { ok: true };
});

app.post("/api/admin/change-password", { preValidation: [app.authenticate] }, async (request, reply) => {
  const { old_password, new_password } = request.body ?? {};
  
  if (!old_password || !new_password) {
    return reply.code(400).send({ error: "passwords_required" });
  }
  if (!authService.verifyAdminPassword(old_password)) {
    return reply.code(401).send({ error: "invalid_old_password" });
  }
  if (new_password.length < 6) {
    return reply.code(400).send({ error: "password_too_short" });
  }
  
  authService.setAdminPassword(new_password);
  return { ok: true };
});

app.post("/api/admin/change-site-password", { preValidation: [app.authenticate] }, async (request, reply) => {
  const { admin_password, new_password } = request.body ?? {};
  
  if (!admin_password || !new_password) {
    return reply.code(400).send({ error: "passwords_required" });
  }
  if (!authService.verifyAdminPassword(admin_password)) {
    return reply.code(401).send({ error: "invalid_admin_password" });
  }
  if (new_password.length < 6) {
    return reply.code(400).send({ error: "password_too_short" });
  }
  
  authService.setSitePassword(new_password);
  return { ok: true };
});

app.get("/api/public-gateway", async () => {
  return { gateways: imageService.getPublicGateways() };
});

app.get("/api/admin/public-gateway", { preValidation: [app.authenticate] }, async () => {
  return { gateways: imageService.getPublicGateways() };
});

app.post("/api/admin/public-gateway", { preValidation: [app.authenticate] }, async (request, reply) => {
  const { gateways } = request.body ?? {};
  
  if (!Array.isArray(gateways)) {
    return reply.code(400).send({ error: "gateways_required" });
  }
  
  const validGateways = gateways
    .filter(g => g.name && g.url)
    .map(g => ({ name: String(g.name), url: String(g.url) }));
  
  if (validGateways.length === 0) {
    return reply.code(400).send({ error: "gateways_invalid" });
  }
  
  imageService.setPublicGateways(validGateways);
  return { ok: true, gateways: validGateways };
});

app.get("/api/health", async () => {
  try {
    await ipfs.id();
    return { ok: true, ipfs: true };
  } catch {
    return { ok: true, ipfs: false };
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  logger.info(`Server listening at ${address}`);
  logger.info(`Logs writing to ${LOG_FILE}`);
});