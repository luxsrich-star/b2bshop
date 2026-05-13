/**
 * In-memory rate limiter for Next.js API routes.
 * Limits each IP to `max` requests per `windowMs` milliseconds.
 * Uses a Map so no external dependency is needed.
 *
 * Security: prevents brute-force and DoS attacks (OWASP A05).
 */

// { ip -> { count, resetAt } }
const store = new Map();

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.resetAt <= now) store.delete(key);
  }
}, 60_000);

/**
 * @param {object} options
 * @param {number} options.windowMs  - Window size in ms (default: 15 min)
 * @param {number} options.max       - Max requests per window (default: 100)
 * @param {string} [options.message] - Error message
 * @returns {(req, res) => boolean}  - Returns true if request is allowed, false if rate-limited
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests, please try again later.",
} = {}) {
  return function rateLimit(req, res) {
    // Prefer X-Forwarded-For (set by Railway/proxies) over socket address
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      // First request in this window
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({ error: message });
      return false;
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(max - entry.count));
    return true;
  };
}

// Pre-built limiters for different endpoint types
// General API: 100 req / 15 min
export const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });

// Auth endpoints: 10 req / 15 min — tighter to slow brute-force
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, please try again in 15 minutes.",
});

// Order submission: 20 req / 15 min
export const orderLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
