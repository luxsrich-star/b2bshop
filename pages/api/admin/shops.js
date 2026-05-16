import { getShops, saveShops } from "@/lib/db";
import { setSecurityHeaders, sanitizeString, sanitizeSlug } from "@/lib/security";

export default function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method === "GET") return res.json(getShops());

  if (req.method === "POST") {
    const shops = getShops();
    const name     = sanitizeString(req.body.name, 100);
    const slug     = sanitizeSlug(req.body.slug);
    const password = sanitizeString(req.body.password, 100);

    if (!name || !slug || !password) return res.status(400).json({ error: "Заполни все поля" });
    if (password.length < 4) return res.status(400).json({ error: "Пароль минимум 4 символа" });
    if (shops.find(s => s.slug === slug)) return res.status(400).json({ error: "Slug уже занят" });

    const newShop = { slug, name, password, blocked: false };
    shops.push(newShop);
    saveShops(shops);
    return res.json(newShop);
  }

  if (req.method === "PUT") {
    const { slug } = req.query;
    let shops = getShops();
    const idx = shops.findIndex(s => s.slug === slug);
    if (idx === -1) return res.status(404).end();
    // Only allow updating safe fields
    const allowed = {};
    if (req.body.blocked !== undefined) allowed.blocked = Boolean(req.body.blocked);
    if (req.body.name)     allowed.name     = sanitizeString(req.body.name, 100);
    if (req.body.password) allowed.password = sanitizeString(req.body.password, 100);
    shops[idx] = { ...shops[idx], ...allowed };
    saveShops(shops);
    return res.json(shops[idx]);
  }

  if (req.method === "DELETE") {
    const { slug } = req.query;
    saveShops(getShops().filter(s => s.slug !== slug));
    return res.json({ ok: true });
  }

  res.status(405).end();
}
