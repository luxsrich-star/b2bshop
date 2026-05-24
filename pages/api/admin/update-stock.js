import { getShops, getShopPrices, saveShopPrices, getShopSettings, getCatalog, getShopCatalog, saveShopCatalog } from "@/lib/db";
import { rateLimit, getIP } from "@/lib/security";

export const config = { api: { bodyParser: true } };

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const limit = rateLimit(getIP(req) + ":update-stock", 60, 60_000);
  if (!limit.ok) return res.status(429).json({ success: false, error: "rate_limit" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { shopSlug, productName, productId, quantityChange, stock: exactStock } = body || {};

  if (!shopSlug) return res.json({ success: false, error: "missing_slug" });

  const shops = getShops();
  if (!shops.find(s => s.slug === shopSlug))
    return res.json({ success: false, error: "shop_not_found" });

  const settings = getShopSettings(shopSlug);
  const useShared = settings.useSharedCatalog;

  const ownCatalog    = getShopCatalog(shopSlug);
  const sharedProducts = getCatalog().products;
  const ownProducts    = ownCatalog.products;

  // При useSharedCatalog=false ищем сначала в own, потом в shared
  const allProducts = useShared
    ? [...sharedProducts, ...ownProducts]
    : [...ownProducts, ...sharedProducts];

  let product = null;
  let isOwn = false; // товар из собственного каталога?

  // 1. По productId
  if (productId) {
    product = allProducts.find(p => p.id === productId);
  }

  // 2. По имени (включение, без учёта регистра)
  if (!product && productName) {
    const name = productName.toLowerCase().trim();
    product = allProducts.find(p => p.name.toLowerCase().includes(name))
           || allProducts.find(p => name.includes(p.name.toLowerCase()));
  }

  if (!product) {
    return res.json({
      success: false,
      error: "product_not_found",
      debug: {
        shopSlug,
        productName,
        useSharedCatalog: useShared,
        totalProducts: allProducts.length,
        productNames: allProducts.map(p => p.name),
      }
    });
  }

  // Определяем — товар из собственного каталога или общего
  isOwn = ownProducts.some(p => p.id === product.id);

  // Текущий остаток: приоритет — prices, потом product.stock
  const prices = getShopPrices(shopSlug);
  const ov = prices[product.id] || {};
  const currentStock = ov.stock !== undefined ? ov.stock : (product.stock || 0);

  // Новый остаток
  let newStock;
  if (exactStock !== undefined && exactStock !== null) {
    newStock = Math.max(0, Number(exactStock));
  } else if (quantityChange !== undefined && quantityChange !== null) {
    newStock = Math.max(0, currentStock + Number(quantityChange));
  } else {
    return res.json({ success: false, error: "provide quantityChange or stock" });
  }

  // 1. Всегда сохраняем в prices (работает для обоих типов каталога)
  prices[product.id] = { ...ov, stock: newStock, hidden: newStock <= 0 };
  saveShopPrices(shopSlug, prices);

  // 2. Если товар из собственного каталога — обновляем stock прямо в нём
  //    чтобы find-product и витрина читали актуальное значение
  if (isOwn) {
    const idx = ownCatalog.products.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      ownCatalog.products[idx] = {
        ...ownCatalog.products[idx],
        stock: newStock,
        hidden: newStock <= 0,
      };
      saveShopCatalog(shopSlug, ownCatalog);
    }
  }

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
