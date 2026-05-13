import { clearSuperAdminCookie, clearShopCookie } from "@/lib/auth";
import { apiLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";

/**
 * POST /api/admin/logout — clear session cookie
 *
 * Security: properly invalidates the httpOnly session cookie server-side.
 * Client-side code cannot clear httpOnly cookies directly.
 *
 * Query params:
 *   ?type=super          — clear super-admin session
 *   ?type=shop&slug=xxx  — clear shop session for slug
 */
export default function handler(req, res) {
  if (!apiLimiter(req, res)) return;
  if (req.method !== "POST") return res.status(405).end();

  const { type, slug } = req.query;
  const ip = getClientIp(req);

  if (type === "super") {
    res.setHeader("Set-Cookie", clearSuperAdminCookie());
    auditLog({ actor: "superadmin", action: "logout", ip });
    return res.json({ ok: true });
  }

  if (type === "shop" && slug) {
    res.setHeader("Set-Cookie", clearShopCookie(slug));
    auditLog({ actor: `shop:${slug}`, action: "logout", target: slug, ip });
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Invalid request" });
}
