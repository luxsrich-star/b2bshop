/**
 * Audit logging system.
 *
 * Security: records all admin actions with actor, action, target, timestamp,
 * and IP address for forensic analysis (OWASP A09 — Security Logging).
 *
 * Logs are written to data/audit.log (newline-delimited JSON).
 * Each entry is appended atomically to avoid data loss.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(DATA_DIR, "audit.log");

// Maximum log file size before rotation (10 MB)
const MAX_LOG_SIZE = 10 * 1024 * 1024;

/**
 * Ensure the data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Rotate the log file if it exceeds MAX_LOG_SIZE.
 * Renames audit.log → audit.log.1 (overwrites previous rotation).
 */
function maybeRotate() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const { size } = fs.statSync(LOG_FILE);
    if (size >= MAX_LOG_SIZE) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".1");
    }
  } catch {
    // Non-fatal: rotation failure should not block the main request
  }
}

/**
 * Write a single audit log entry.
 *
 * @param {object} entry
 * @param {string} entry.actor   - Who performed the action: "superadmin" | "shop:<slug>"
 * @param {string} entry.action  - What was done: "login", "createShop", "deleteProduct", etc.
 * @param {string} [entry.target]- The affected resource (slug, product id, etc.)
 * @param {string} [entry.ip]    - Client IP address
 * @param {object} [entry.meta]  - Additional context (sanitized, no passwords)
 */
export function auditLog({ actor, action, target = "", ip = "unknown", meta = {} }) {
  try {
    ensureDir();
    maybeRotate();

    const entry = {
      ts: new Date().toISOString(),
      actor,
      action,
      target,
      ip,
      meta,
    };

    // Append as newline-delimited JSON (each line is a valid JSON object)
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    // Audit log failure must never crash the application
    console.error("[AuditLog] Failed to write log entry:", err.message);
  }
}

/**
 * Extract the client IP from a Next.js API request.
 * Respects X-Forwarded-For set by Railway's proxy.
 */
export function getClientIp(req) {
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}
