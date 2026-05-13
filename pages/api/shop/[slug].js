import { getShops, getShopSettings, getMergedProducts, getMergedCategories } from "@/lib/db";
import { apiLimiter } from "@/lib/rateLimit";

/**
 * GET /api/shop/[slug] — public storefront data
 *
 * Security measures:
 *   - Rate limited to 100 req / 15 min (DoS protection)
 *   - Slug format validated before file system access
 *   - No sensitive data (passwords, etc.) exposed
 */
export default function handler(req, res) {
  // Rate limiting
  if (!apiLimiter(req, res)) return;

  if (req.method !== "GET") return res.status(405).end();

  const { slug } = req.query;

  // Validate slug format to prevent path traversal
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid shop identifier" });
  }

  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);
  if (!shop || shop.blocked) return res.status(404).json({ error: "Магазин не найден" });

  const settings   = getShopSettings(slug);
  const categories = getMergedCategories(slug);
  const products   = getMergedProducts(slug);

  res.json({ settings, categories, products });
}
