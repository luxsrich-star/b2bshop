import { getShops, getShopPrices, getShopSettings, getCatalog, getShopCatalog } from "@/lib/db";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { shopSlug, productName } = req.query;
  if (!shopSlug || !productName) return res.status(400).json({ found:false, error:"missing fields" });

  const shops = getShops();
  if (!shops.find(s => s.slug === shopSlug)) return res.json({ found:false, error:"shop_not_found" });

  const settings = getShopSettings(shopSlug);
  const products = settings.useSharedCatalog
    ? getCatalog().products
    : getShopCatalog(shopSlug).products;

  const name = productName.toLowerCase().trim();
  const product = products.find(p => p.name.toLowerCase().includes(name));
  if (!product) return res.json({ found: false });

  const prices = getShopPrices(shopSlug);
  const ov     = prices[product.id] || {};

  return res.json({
    found:        true,
    productId:    product.id,
    productName:  product.name,
    price:        ov.price  !== undefined ? ov.price  : product.basePrice,
    cost:         ov.cost   !== undefined ? ov.cost   : (product.cost || 0),
    currentStock: ov.stock  !== undefined ? ov.stock  : (product.stock || 0),
  });
}
