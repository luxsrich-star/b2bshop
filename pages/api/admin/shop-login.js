import { getShops, verifyPassword } from "@/lib/db";
import { buildShopCookie } from "@/lib/auth";
import { authLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";
import { sanitizeSlug } from "@/lib/validate";

/**
 * POST /api/admin/shop-login
 *
 * Security measures:
 *   - Rate limited to 10 attempts per 15 min (brute-force protection)
 *   - bcrypt password comparison with legacy plaintext fallback
 *   - Sets httpOnly, secure, sameSite=strict cookie (replaces sessionStorage)
 *   - Audit logs all login attempts
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Rate limiting — must check before any processing
  if (!authLimiter(req, res)) return;

  const ip = getClientIp(req);
  const { slug, password } = req.body || {};

  // Validate inputs
  const cleanSlug = sanitizeSlug(slug || "");
  if (!cleanSlug) return res.status(400).json({ ok: false, error: "Invalid shop identifier" });
  if (!password || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Password required" });
  }

  // Truncate to prevent DoS via extremely long passwords (bcrypt vulnerability)
  const trimmedPassword = password.slice(0, 128);

  const shops = getShops();
  const shop = shops.find(s => s.slug === cleanSlug);

  // Use a generic error for not-found to avoid shop enumeration
  if (!shop) {
    auditLog({ actor: `shop:${cleanSlug}`, action: "login_failure", target: cleanSlug, ip, meta: { reason: "not_found" } });
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  if (shop.blocked) {
    auditLog({ actor: `shop:${cleanSlug}`, action: "login_blocked", target: cleanSlug, ip });
    return res.status(403).json({ ok: false, error: "Магазин заблокирован" });
  }

  const valid = await verifyPassword(trimmedPassword, shop.password);
  if (!valid) {
    auditLog({ actor: `shop:${cleanSlug}`, action: "login_failure", target: cleanSlug, ip });
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  // Set httpOnly session cookie — JavaScript cannot read this (XSS protection)
  res.setHeader("Set-Cookie", buildShopCookie(cleanSlug, "authenticated"));
  auditLog({ actor: `shop:${cleanSlug}`, action: "login_success", target: cleanSlug, ip });
  return res.json({ ok: true, name: shop.name });
}
