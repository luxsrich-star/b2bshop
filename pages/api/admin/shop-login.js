import { getShops } from "@/lib/db";
import { rateLimit, setSecurityHeaders, getIP, sanitizeString } from "@/lib/security";

export default function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).end();

  const ip = getIP(req);
  const slug = sanitizeString(req.body?.slug || "", 50);
  const limit = rateLimit(ip + ":login:" + slug, 5, 60_000);
  if (!limit.ok) {
    return res.status(429).json({ ok: false, error: `Слишком много попыток. Подождите ${limit.retryAfter} сек.` });
  }

  const { password } = req.body;
  if (!slug || !password) return res.status(400).json({ ok: false, error: "Данные не указаны" });

  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);

  if (!shop) return res.status(404).json({ ok: false, error: "Магазин не найден" });
  if (shop.blocked) return res.status(403).json({ ok: false, error: "Магазин заблокирован" });

  // Timing-safe comparison
  const crypto = require("crypto");
  const buf1 = Buffer.alloc(256, String(password));
  const buf2 = Buffer.alloc(256, String(shop.password));
  const match = crypto.timingSafeEqual(buf1, buf2) && password === shop.password;

  if (!match) return res.status(401).json({ ok: false, error: "Неверный пароль" });
  return res.json({ ok: true, name: shop.name });
}
