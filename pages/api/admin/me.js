import { isSuperAdmin, isShopAuthed } from "@/lib/auth";
import { apiLimiter } from "@/lib/rateLimit";

/**
 * GET /api/admin/me — session check endpoint
 *
 * Used by admin pages on load to verify the httpOnly cookie session
 * without exposing any credentials to JavaScript.
 *
 * Security: replaces sessionStorage.getItem() checks (which are XSS-readable)
 * with a server-side cookie validation (OWASP A07).
 *
 * Query params:
 *   ?type=super          — check super-admin session
 *   ?type=shop&slug=xxx  — check shop session for slug
 */
export default function handler(req, res) {
  if (!apiLimiter(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();

  const { type, slug } = req.query;

  if (type === "super") {
    return res.json({ authed: isSuperAdmin(req) });
  }

  if (type === "shop" && slug) {
    return res.json({ authed: isShopAuthed(req, slug) });
  }

  return res.status(400).json({ error: "Invalid request" });
}
