import { getShops, getShopPrices, saveShopPrices, getShopSettings, getCatalog, getShopCatalog } from "@/lib/db";
import { rateLimit, getIP } from "@/lib/security";

export const config = { api: { bodyParser: true } };

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const limit = rateLimit(getIP(req) + ":update-stock", 60, 60_000);
  if (!limit.ok) return res.status(429).json({ success:false, error:"rate_limit" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { shopSlug, productName, productId, quantityChange, stock: exactStock } = body || {};

  if (!shopSlug) return res.json({ success:false, error:"shop_not_found" });

  const shops = getShops();
  if (!shops.find(s => s.slug === shopSlug)) return res.json({ success:false, error:"shop_not_found" });

  const settings = getShopSettings(shopSlug);
  // search both own and shared catalogs
  const ownProducts    = getShopCatalog(shopSlug).products;
  const sharedProducts = getCatalog().products;
  const allProducts    = settings.useSharedCatalog
    ? [...sharedProducts, ...ownProducts]
    : [...ownProducts, ...sharedProducts];

  let product = null;

  // 1. search by productId first (exact)
  if (productId) {
    product = allProducts.find(p => p.id === productId);
  }

  // 2. search by name (includes, case-insensitive)
  if (!product && productName) {
    const name = productName.toLowerCase().trim();
    product = allProducts.find(p => p.name.toLowerCase().includes(name));
  }

  // 3. fallback: search by name exact match
  if (!product && productName) {
    const name = productName.toLowerCase().trim();
    product = allProducts.find(p => p.name.toLowerCase() === name);
  }

  if (!product) {
    return res.json({
      success: false,
      error: "product_not_found",
      debug: {
        shopSlug,
        productName,
        useSharedCatalog: settings.useSharedCatalog,
        totalProducts: allProducts.length,
        productNames: allProducts.map(p => p.name),
      }
    });
  }

  const prices = getShopPrices(shopSlug);
  const ov     = prices[product.id] || {};
  const currentStock = ov.stock !== undefined ? ov.stock : (product.stock || 0);

  let newStock;
  if (exactStock !== undefined && exactStock !== null) {
    newStock = Math.max(0, Number(exactStock));
  } else if (quantityChange !== undefined && quantityChange !== null) {
    newStock = Math.max(0, currentStock + Number(quantityChange));
  } else {
    return res.json({ success:false, error:"provide quantityChange or stock" });
  }

  prices[product.id] = { ...ov, stock: newStock, hidden: newStock <= 0 };
  saveShopPrices(shopSlug, prices);

  return res.json({
    success:       true,
    productId:     product.id,
    productName:   product.name,
    shopSlug,
    previousStock: currentStock,
    newStock,
    hidden:        newStock <= 0,
  });
}
