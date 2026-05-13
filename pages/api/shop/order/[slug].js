import { getShops, getShopOrders, saveShopOrders } from "@/lib/db";
import { orderLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";
import {
  sanitizeName, sanitizeComment, sanitizeTelegram, isValidTelegram,
  parsePositiveNumber, parseNonNegativeInt, validateOrderItems
} from "@/lib/validate";

/**
 * POST /api/shop/order/[slug] — public order submission (primary endpoint)
 *
 * Security measures:
 *   - Rate limited to 20 req / 15 min (prevents order spam)
 *   - Input validation and sanitization on all fields
 *   - Telegram username validated to Telegram format rules
 *   - Slug format validated before file system access
 *   - Audit logging for all orders
 */
export default function handler(req, res) {
  // Rate limiting — tighter limit for order submission
  if (!orderLimiter(req, res)) return;

  if (req.method !== "POST") return res.status(405).end();

  const { slug } = req.query;

  // Validate slug format to prevent path traversal
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid shop identifier" });
  }

  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);
  if (!shop || shop.blocked) return res.status(404).json({ error: "Не найдено" });

  const ip = getClientIp(req);

  // Validate and sanitize all inputs
  const client = sanitizeName(req.body?.client || "");
  if (!client) return res.status(400).json({ error: "Client name is required" });

  // Telegram username validation
  const rawTg = (req.body?.tg || "").replace(/^@/, "");
  if (rawTg && !isValidTelegram(rawTg)) {
    return res.status(400).json({ error: "Invalid Telegram username (5-32 chars, alphanumeric + underscore)" });
  }
  const tg = rawTg ? (sanitizeTelegram(rawTg) || "") : "";

  const comment = sanitizeComment(req.body?.comment || "");

  // Validate order items
  const itemsError = validateOrderItems(req.body?.items);
  if (itemsError) return res.status(400).json({ error: itemsError });

  const total = parsePositiveNumber(req.body?.total);
  if (total === null) return res.status(400).json({ error: "Invalid total" });

  const orders = getShopOrders(slug);
  const id = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
  const order = {
    id,
    date: new Date().toLocaleString("ru"),
    client,
    tg,
    comment,
    items: req.body.items.map(i => ({
      name: sanitizeName(i.name),
      qty: parseNonNegativeInt(i.qty),
      price: parsePositiveNumber(i.price),
    })),
    total,
    status: "Новый",
  };
  orders.unshift(order);
  saveShopOrders(slug, orders);
  auditLog({ actor: `customer:${slug}`, action: "createOrder", target: slug, ip, meta: { orderId: id, total } });
  return res.json(order);
}
