import { verifyPassword } from "@/lib/db";
import { buildSuperAdminCookie } from "@/lib/auth";
import { authLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";

/**
 * POST /api/admin/login
 *
 * Security measures:
 *   - Rate limited to 10 attempts per 15 min (brute-force protection)
 *   - bcrypt password comparison (timing-safe)
 *   - Sets httpOnly, secure, sameSite=strict cookie (replaces sessionStorage)
 *   - Audit logs all login attempts
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Rate limiting — must check before any processing
  if (!authLimiter(req, res)) return;

  const ip = getClientIp(req);
  const { password } = req.body || {};

  if (!password || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Password required" });
  }

  // Truncate to prevent DoS via extremely long passwords (bcrypt vulnerability)
  const trimmedPassword = password.slice(0, 128);

  const correct = process.env.SUPER_ADMIN_PASSWORD || "superadmin";
  const valid = await verifyPassword(trimmedPassword, correct);

  if (valid) {
    // Set httpOnly session cookie — JavaScript cannot read this (XSS protection)
    res.setHeader("Set-Cookie", buildSuperAdminCookie("authenticated"));
    auditLog({ actor: "superadmin", action: "login_success", ip });
    return res.status(200).json({ ok: true });
  }

  auditLog({ actor: "superadmin", action: "login_failure", ip });
  // Use a generic error message to avoid user enumeration
  return res.status(401).json({ ok: false, error: "Invalid credentials" });
}
