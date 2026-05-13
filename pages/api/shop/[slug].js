import { getShops, getShopSettings, getMergedProducts, getMergedCategories } from "@/lib/db";

export default function handler(req, res) {
  const { slug } = req.query;
  const shops = getShops();
  const shop = shops.find(s => s.slug === slug);
  if (!shop || shop.blocked) return res.status(404).json({ error: "Магазин не найден" });

  const settings   = getShopSettings(slug);
  const categories = getMergedCategories(slug);
  const products   = getMergedProducts(slug);

  res.json({ settings, categories, products });
}
