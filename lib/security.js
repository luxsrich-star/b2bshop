import crypto from "crypto";

// ─── Rate limiter (in-memory, per IP) ────────────────────────────────────────
const attempts = new Map(); // ip -> { count, resetAt }

export function rateLimit(ip, maxAttempts = 10, windowMs = 60_000) {
  const now = Date.now();
  const key = ip || "unknown";
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= maxAttempts) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}

// ─── Security headers ─────────────────────────────────────────────────────────
export function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com blob:; connect-src 'self' https://api.cloudinary.com;"
  );
}

// ─── Input sanitization ───────────────────────────────────────────────────────
export function sanitizeString(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str
    .trim()
    .slice(0, maxLen)
    .replace(/[<>]/g, "") // strip basic XSS chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // strip control chars
}

export function sanitizeSlug(slug) {
  return (slug || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 50);
}

export function sanitizeNumber(val, min = 0, max = 9_999_999) {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ─── Password hashing ─────────────────────────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  // Support plain text passwords (legacy) and hashed ones
  if (!stored.includes(":")) return password === stored;
  const [salt, hash] = stored.split(":");
  const inputHash = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(inputHash, "hex"));
}

// ─── CSRF token (simple double-submit cookie pattern) ────────────────────────
export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Request IP ──────────────────────────────────────────────────────────────
export function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ─── Validate order items ─────────────────────────────────────────────────────
export function sanitizeOrderItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 200).map(item => ({
    name:  sanitizeString(item.name, 300),
    qty:   sanitizeNumber(item.qty, 1, 9999),
    price: sanitizeNumber(item.price, 0, 999999),
  })).filter(item => item.name && item.qty > 0);
}
