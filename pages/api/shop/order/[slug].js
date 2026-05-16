import { getShops, getShopOrders, saveShopOrders } from "@/lib/db";
import { rateLimit, setSecurityHeaders, getIP, sanitizeString, sanitizeOrderItems } from "@/lib/security";

export default function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).end();

  const { slug } = req.query;
  const ip = getIP(req);

  // Rate limit: 10 orders per 10 minutes per IP
  const limit = rateLimit(ip + ":order", 10, 600_000);
  if (!limit.ok) {
    return res.status(429).json({ error: `Слишком много запросов. Подождите ${limit.retryAfter} сек.` });
  }

  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);
  if (!shop || shop.blocked) return res.status(404).json({ error: "Не найдено" });

  const client  = sanitizeString(req.body.client, 200);
  const tg      = sanitizeString((req.body.tg || "").replace(/^@/, ""), 100);
  const comment = sanitizeString(req.body.comment || "", 500);
  const items   = sanitizeOrderItems(req.body.items);
  const total   = items.reduce((s, i) => s + i.qty * i.price, 0);

  if (!client || !tg) return res.status(400).json({ error: "Укажи имя и Telegram" });
  if (items.length === 0) return res.status(400).json({ error: "Корзина пуста" });

  const orders = getShopOrders(slug);
  const id = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
  const order = { id, date: new Date().toLocaleString("ru"), client, tg, comment, items, total, status: "Новый" };
  orders.unshift(order);
  saveShopOrders(slug, orders);
  return res.json(order);
}
