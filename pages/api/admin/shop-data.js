import {
  getShops, getShopSettings, saveShopSettings,
  getShopPrices, saveShopPrices,
  getShopOrders, saveShopOrders,
  getCatalog, saveBase64Image
} from "@/lib/db";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

function shopExists(slug) { return !!getShops().find(s => s.slug === slug); }

export default function handler(req, res) {
  const { slug, action } = req.query;
  if (!shopExists(slug)) return res.status(404).json({ error: "Магазин не найден" });

  // GET all data for seller panel
  if (req.method === "GET") {
    const settings = getShopSettings(slug);
    const prices   = getShopPrices(slug);
    const orders   = getShopOrders(slug);
    const catalog  = getCatalog();
    return res.json({ settings, prices, orders, catalog });
  }

  // POST action=saveSettings
  if (req.method === "POST" && action === "saveSettings") {
    const current = getShopSettings(slug);
    let logoImg = current.logoImg;
    if (req.body.logoImg === null) logoImg = null;
    else if (req.body.logoImg?.startsWith("data:")) logoImg = saveBase64Image(req.body.logoImg);
    const updated = { ...current, ...req.body, logoImg };
    saveShopSettings(slug, updated);
    return res.json(updated);
  }

  // POST action=savePrices  body: { productId, price, stock, hidden }
  if (req.method === "POST" && action === "savePrice") {
    const prices = getShopPrices(slug);
    const { productId, price, stock, hidden } = req.body;
    prices[productId] = {
      price:  price  !== undefined ? Number(price)  : undefined,
      stock:  stock  !== undefined ? Number(stock)  : undefined,
      hidden: hidden !== undefined ? Boolean(hidden) : undefined,
    };
    // remove undefined keys
    Object.keys(prices[productId]).forEach(k => prices[productId][k] === undefined && delete prices[productId][k]);
    saveShopPrices(slug, prices);
    return res.json({ ok: true });
  }

  // POST action=createOrder
  if (req.method === "POST" && action === "createOrder") {
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

  // PUT action=updateOrder
  if (req.method === "PUT" && action === "updateOrder") {
    const { id } = req.body;
    const orders = getShopOrders(slug);
    const idx = orders.findIndex(o => o.id === Number(id));
    if (idx === -1) return res.status(404).end();
    orders[idx] = { ...orders[idx], ...req.body };
    saveShopOrders(slug, orders);
    return res.json(orders[idx]);
  }

  res.status(405).end();
}
