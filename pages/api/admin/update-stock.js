import { getShops, getShopPrices, saveShopPrices, getShopSettings, getCatalog, getShopCatalog } from "@/lib/db";
import { rateLimit, getIP } from "@/lib/security";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // rate limit: 60 per minute per IP
  const limit = rateLimit(getIP(req) + ":update-stock", 60, 60_000);
  if (!limit.ok) return res.status(429).json({ success:false, error:"rate_limit" });

  const { shopSlug, productName, quantityChange, stock: exactStock } = req.body;
  if (!shopSlug) return res.json({ success:false, error:"shop_not_found" });

  const shops = getShops();
  if (!shops.find(s => s.slug === shopSlug)) return res.json({ success:false, error:"shop_not_found" });

  const settings = getShopSettings(shopSlug);
  const products = settings.useSharedCatalog
    ? getCatalog().products
    : getShopCatalog(shopSlug).products;

  if (!productName) return res.json({ success:false, error:"product_not_found" });
  const name    = productName.toLowerCase().trim();
  const product = products.find(p => p.name.toLowerCase().includes(name));
  if (!product)  return res.json({ success:false, error:"product_not_found" });

  const prices = getShopPrices(shopSlug);
  const ov     = prices[product.id] || {};
  const currentStock = ov.stock !== undefined ? ov.stock : (product.stock || 0);

  let newStock;
  if (exactStock !== undefined) {
    newStock = Math.max(0, Number(exactStock));
  } else if (quantityChange !== undefined) {
    newStock = Math.max(0, currentStock + Number(quantityChange));
  } else {
    return res.json({ success:false, error:"provide quantityChange or stock" });
  }

  prices[product.id] = {
    ...ov,
    stock:  newStock,
    hidden: newStock <= 0,
  };
  saveShopPrices(shopSlug, prices);

  return res.json({
    success:     true,
    productId:   product.id,
    productName: product.name,
    shopSlug,
    previousStock: currentStock,
    newStock,
    hidden: newStock <= 0,
  });
}
