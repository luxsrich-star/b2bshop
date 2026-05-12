import { getShops } from "@/lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { slug, password } = req.body;
  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);
  if (!shop) return res.status(404).json({ ok: false, error: "Магазин не найден" });
  if (shop.blocked) return res.status(403).json({ ok: false, error: "Магазин заблокирован" });
  if (shop.password !== password) return res.status(401).json({ ok: false, error: "Неверный пароль" });
  return res.json({ ok: true, name: shop.name });
}
