import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import jwt from "@fastify/jwt";
import staticPlugin from "@fastify/static";
import { create } from "kubo-rpc-client";
import { UAParser } from "ua-parser-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initDb } from "./db.js";
import { logger, LOG_FILE } from "./logger.js";
import { AuthService } from "./services/auth.service.js";
import { StorageService } from "./services/storage.service.js";
import { ImageService } from "./services/image.service.js";
import { ERROR_CODES } from "./services/constants.js";

const {
  PORT = 16661,
  DATA_DIR = "/data",
  DB_PATH,
  JWT_SECRET = crypto.randomBytes(32).toString('hex')
} = process.env;

const IPFS_API_URL = "http://127.0.0.1:5001";

function generateAccessPath() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('md5').update(`${timestamp}-${random}`).digest('hex');
  return hash.substring(0, 16);
}

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const ACTUAL_DB_PATH = DB_PATH ?? path.join(DATA_DIR, "db.sqlite");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const db = initDb(ACTUAL_DB_PATH);

const authService = new AuthService(db, null);
const storageService = new StorageService(db, UPLOAD_DIR, DATA_DIR);
const imageService = new ImageService(db, UPLOAD_DIR);

const app = Fastify({ logger: true, trustProxy: true });

app.log.info({ ipfsUrl: IPFS_API_URL }, "Initializing IPFS client");
const ipfs = create({ url: IPFS_API_URL });
app.log.info("IPFS client initialized");

async function initApp() {
  await app.register(jwt, { secret: JWT_SECRET, sign: { expiresIn: '7d' } });
  app.decorate("authenticate", async (request, reply) => {
    await request.jwtVerify();
  });

  await app.register(multipart, { limits: { fileSize: Infinity } });

  await app.register(staticPlugin, {
    root: path.join(__dirname, "../../public"),
    prefix: "/"
  });
}

await initApp();

const nowIso = () => new Date().toISOString();
const getClientIp = (request) => request.ip ?? request.headers["x-forwarded-for"] ?? "unknown";
const parseUserAgent = (ua) => {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };
  }
  
  const parser = new UAParser(ua);
  const result = parser.getResult();
  
  return {
    browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    device: result.device.type || 'desktop'
  };
};

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

    const ext = path.extname(part.filename ?? "");
    const filename = `${crypto.randomUUID()}${ext}`;
    storedPath = path.join(UPLOAD_DIR, filename);

    const currentTotal = storageService.getTotalLocalBytes();
    const limit = storageService.getLocalLimitBytes();

    if (part.file.size > limit) {
      return reply.code(400).send({ 
        error: "file_size_exceeds_limit",
        message: `文件大小 ${(part.file.size / 1024 / 1024 / 1024).toFixed(2)}GB 超过最大上传限制 ${(limit / 1024 / 1024 / 1024).toFixed(2)}GB`
      });
    }

    if (currentTotal + part.file.size > limit) {
      return reply.code(400).send({ 
        error: "storage_limit_exceeded",
        message: `容量不足，剩余 ${((limit - currentTotal) / 1024 / 1024 / 1024).toFixed(2)}GB，需要 ${(part.file.size / 1024 / 1024 / 1024).toFixed(2)}GB`
      });
    }

    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(storedPath);
      part.file.pipe(stream);
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    const stat = fs.statSync(storedPath);
    const fileBuffer = fs.readFileSync(storedPath);
    const { cid } = await ipfs.add(fileBuffer, { pin: true, cidVersion: 1 });

    const cidStr = cid.toString();
    const ua = request.headers["user-agent"] ?? "";
    const parsedUA = parseUserAgent(ua);
    const accessPath = generateAccessPath();

    const rowId = imageService.insertImage({
      cid: cidStr,
      filename,
      original_name: part.filename,
      mime_type: part.mimetype,
      size_bytes: stat.size,
      stored_path: storedPath,
      created_at: nowIso(),
      uploader_ip: getClientIp(request),
      uploader_ua: ua,
      uploader_browser: parsedUA.browser,
      uploader_os: parsedUA.os,
      uploader_device: parsedUA.device,
      pin_status: "local",
      access_path: accessPath
    });

    storageService.cleanupByStorageLimit();

    return {
      id: rowId,
      cid: cidStr,
      original_name: part.filename,
      ipfs_url: `${imageService.getPublicGatewayUrl()}/${cidStr}`,
      local_url: `/files/${accessPath}`
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
    SELECT id, cid, filename, original_name, mime_type, size_bytes, created_at, access_path
    FROM images ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  
  return rows.map(row => imageService.mapImageRow(row));
});

app.get("/files/:accessPath", async (request, reply) => {
  const accessPath = request.params.accessPath;
  const row = db.prepare("SELECT stored_path, mime_type FROM images WHERE access_path = ?").get(accessPath);
  
  if (!row?.stored_path || !fs.existsSync(row.stored_path)) {
    return reply.code(404).send({ error: "not_found" });
  }
  
  imageService.updateAccessByAccessPath(accessPath);
  return reply.header("content-type", row.mime_type).send(fs.createReadStream(row.stored_path));
});

app.get("/ipfs/:cid", async (request, reply) => {
  const cid = request.params.cid;
  const targetUrl = `http://127.0.0.1:16662/ipfs/${cid}`;

  const response = await fetch(targetUrl);
  if (!response.ok) {
    return reply.code(response.status).send({ error: "not_found" });
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

  return reply.header("content-type", contentType).send(buffer);
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
    const id = await ipfs.id();
    app.log.info({ ipfsId: id }, "IPFS health check passed");
    return { ok: true, ipfs: true };
  } catch (error) {
    app.log.error({ error, ipfsUrl: IPFS_API_URL }, "IPFS health check failed");
    return { ok: true, ipfs: false };
  }
});

app.setNotFoundHandler((request, reply) => {
  if (!request.url.startsWith('/api') && !request.url.startsWith('/files')) {
    return reply.sendFile('index.html', path.join(__dirname, "../../public"));
  }
  reply.code(404).send({ error: 'Not Found' });
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log('');
  console.log('🚀 IPFS Gallery Server');
  console.log(`📝 API: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Gateway: http://0.0.0.0:16662`);
  console.log(`📁 Data: ${DATA_DIR}`);
  console.log(`📊 Log: ${LOG_FILE}`);
  console.log('');
  logger.info(`Server listening at ${address}`);
  logger.info(`Logs writing to ${LOG_FILE}`);
});