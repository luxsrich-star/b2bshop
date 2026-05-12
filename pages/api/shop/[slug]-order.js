import { getShops, getShopOrders, saveShopOrders } from "@/lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { slug } = req.query;
  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);
  if (!shop || shop.blocked) return res.status(404).json({ error: "Не найдено" });

  const orders = getShopOrders(slug);
  const id = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
  const order = {
    id, date: new Date().toLocaleString("ru"),
    client: req.body.client,
    tg: (req.body.tg || "").replace(/^@/, ""),
    comment: req.body.comment || "",
    items: req.body.items,
    total: req.body.total,
    status: "Новый",
  };
  orders.unshift(order);
  saveShopOrders(slug, orders);
  return res.json(order);
}
