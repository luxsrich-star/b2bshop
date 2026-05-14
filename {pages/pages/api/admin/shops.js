import { getShops, saveShops } from "@/lib/db";

export default function handler(req, res) {
  if (req.method === "GET") return res.json(getShops());

  if (req.method === "POST") {
    const shops = getShops();
    const { name, slug, password } = req.body;
    if (!name || !slug || !password) return res.status(400).json({ error: "Заполни все поля" });
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
    shops[idx] = { ...shops[idx], ...req.body };
    saveShops(shops);
    return res.json(shops[idx]);
  }

  if (req.method === "DELETE") {
    const { slug } = req.query;
    let shops = getShops();
    shops = shops.filter(s => s.slug !== slug);
    saveShops(shops);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
