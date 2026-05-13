import { getShops, saveShops, hashPassword } from "@/lib/db";
import { isSuperAdmin } from "@/lib/auth";
import { apiLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";
import { sanitizeName, sanitizeSlug } from "@/lib/validate";

/**
 * /api/admin/shops — shop management (super-admin only)
 *
 * Security measures:
 *   - All methods require super-admin cookie authentication
 *   - Rate limited to 100 req / 15 min
 *   - Input validation and sanitization on all write operations
 *   - Passwords hashed with bcrypt before storage
 *   - Audit logging for all mutations
 *   - Passwords stripped from GET responses
 */
export default async function handler(req, res) {
  // Rate limiting
  if (!apiLimiter(req, res)) return;

  // Authentication — all shop management requires super-admin session
  if (!isSuperAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ip = getClientIp(req);

  if (req.method === "GET") {
    const shops = getShops();
    // Security: strip password hashes from the response — the UI only needs
    // to know a password exists, not what it is
    const safe = shops.map(({ password: _pw, ...rest }) => rest);
    return res.json(safe);
  }

  if (req.method === "POST") {
    const shops = getShops();
    const { name, slug, password } = req.body || {};

    // Input validation
    const cleanName = sanitizeName(name || "");
    const cleanSlug = sanitizeSlug(slug || "");
    if (!cleanName || !cleanSlug || !password) {
      return res.status(400).json({ error: "Заполни все поля" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: "Пароль слишком длинный" });
    }
    if (shops.find(s => s.slug === cleanSlug)) {
      return res.status(400).json({ error: "Slug уже занят" });
    }

    // Hash password before storage (OWASP A02)
    const hashedPassword = await hashPassword(password);
    const newShop = { slug: cleanSlug, name: cleanName, password: hashedPassword, blocked: false };
    shops.push(newShop);
    saveShops(shops);

    auditLog({ actor: "superadmin", action: "createShop", target: cleanSlug, ip, meta: { name: cleanName } });

    // Return shop without password hash
    const { password: _pw, ...safeShop } = newShop;
    return res.json(safeShop);
  }

  if (req.method === "PUT") {
    const { slug } = req.query;
    const cleanSlug = sanitizeSlug(slug || "");
    if (!cleanSlug) return res.status(400).json({ error: "Invalid slug" });

    let shops = getShops();
    const idx = shops.findIndex(s => s.slug === cleanSlug);
    if (idx === -1) return res.status(404).end();

    const updates = {};

    // Only allow specific fields to be updated (whitelist approach)
    if (req.body.name !== undefined) updates.name = sanitizeName(req.body.name);
    if (req.body.blocked !== undefined) updates.blocked = Boolean(req.body.blocked);

    // Password change requires re-hashing
    if (req.body.password !== undefined) {
      const newPass = req.body.password;
      if (typeof newPass !== "string" || newPass.length < 6) {
        return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
      }
      updates.password = await hashPassword(newPass.slice(0, 128));
    }

    shops[idx] = { ...shops[idx], ...updates };
    saveShops(shops);

    auditLog({ actor: "superadmin", action: "updateShop", target: cleanSlug, ip, meta: { updates: Object.keys(updates) } });

    const { password: _pw, ...safeShop } = shops[idx];
    return res.json(safeShop);
  }

  if (req.method === "DELETE") {
    const { slug } = req.query;
    const cleanSlug = sanitizeSlug(slug || "");
    if (!cleanSlug) return res.status(400).json({ error: "Invalid slug" });

    let shops = getShops();
    if (!shops.find(s => s.slug === cleanSlug)) return res.status(404).end();

    shops = shops.filter(s => s.slug !== cleanSlug);
    saveShops(shops);

    auditLog({ actor: "superadmin", action: "deleteShop", target: cleanSlug, ip });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
