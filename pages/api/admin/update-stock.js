import { getShops, getShopSettings, saveShopSettings, getShopPrices, saveShopPrices, getShopOrders, saveShopOrders, getShopCatalog, saveShopCatalog, getCatalog, saveBase64Image } from "@/lib/db";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

function shopExists(slug) { return !!getShops().find(s => s.slug === slug); }

export default async function handler(req, res) {
  const { slug, action, id } = req.query;
  if (!shopExists(slug)) return res.status(404).json({ error: "Магазин не найден" });

  if (req.method === "GET") {
    return res.json({ settings: getShopSettings(slug), prices: getShopPrices(slug), orders: getShopOrders(slug), sharedCatalog: getCatalog(), ownCatalog: getShopCatalog(slug) });
  }

  if (req.method === "POST" && action === "saveSettings") {
    const current = getShopSettings(slug);
    let logoImg = current.logoImg;
    if (req.body.logoImg === null) logoImg = null;
    else if (req.body.logoImg?.startsWith("data:")) logoImg = await saveBase64Image(req.body.logoImg);
    const updated = { ...current, ...req.body, logoImg };
    saveShopSettings(slug, updated);
    return res.json(updated);
  }

  // ── savePrice: теперь сохраняет и cost ──────────────────────────────────
  if (req.method === "POST" && action === "savePrice") {
    const prices = getShopPrices(slug);
    const { productId, price, cost, stock, hidden } = req.body;
    if (!prices[productId]) prices[productId] = {};
    if (price  !== undefined) prices[productId].price  = Number(price);
    if (cost   !== undefined) prices[productId].cost   = Number(cost);   // ← ДОБАВЛЕНО
    if (stock  !== undefined) prices[productId].stock  = Number(stock);
    if (hidden !== undefined) prices[productId].hidden = Boolean(hidden);
    saveShopPrices(slug, prices);

    // Если это товар из собственного каталога — обновляем cost и там тоже
    const ownCatalog = getShopCatalog(slug);
    const idx = ownCatalog.products.findIndex(p => p.id === productId);
    if (idx !== -1) {
      if (price !== undefined) ownCatalog.products[idx].price     = Number(price);
      if (price !== undefined) ownCatalog.products[idx].basePrice = Number(price);
      if (cost  !== undefined) ownCatalog.products[idx].cost      = Number(cost); // ← ДОБАВЛЕНО
      if (stock !== undefined) ownCatalog.products[idx].stock     = Number(stock);
      saveShopCatalog(slug, ownCatalog);
    }

    return res.json({ ok: true });
  }

  // ── own catalog ──────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "addOwnCategory") {
    const cat = getShopCatalog(slug);
    const newCat = { id: uuid(), name: req.body.name, parentId: req.body.parentId || null };
    cat.categories.push(newCat); saveShopCatalog(slug, cat);
    return res.json(newCat);
  }
  if (req.method === "PUT" && action === "updateOwnCategory") {
    const cat = getShopCatalog(slug);
    const idx = cat.categories.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).end();
    cat.categories[idx] = { ...cat.categories[idx], ...req.body };
    saveShopCatalog(slug, cat);
    return res.json(cat.categories[idx]);
  }
  if (req.method === "DELETE" && action === "deleteOwnCategory") {
    const cat = getShopCatalog(slug);
    const toDelete = []; const q = [id];
    while (q.length) { const cid = q.shift(); toDelete.push(cid); cat.categories.filter(c => c.parentId === cid).forEach(c => q.push(c.id)); }
    cat.categories = cat.categories.filter(c => !toDelete.includes(c.id));
    cat.products   = cat.products.filter(p => !toDelete.includes(p.categoryId));
    saveShopCatalog(slug, cat); return res.json({ deleted: toDelete });
  }

  // addOwnProduct: теперь сохраняет cost ────────────────────────────────────
  if (req.method === "POST" && action === "addOwnProduct") {
    const cat = getShopCatalog(slug);
    const imgUrl = await saveBase64Image(req.body.img);
    const prod = {
      id:         uuid(),
      categoryId: req.body.categoryId,
      name:       req.body.name,
      price:      Number(req.body.price),
      basePrice:  Number(req.body.price),
      cost:       Number(req.body.cost) || 0,   // ← ДОБАВЛЕНО
      stock:      Number(req.body.stock) || 0,
      img:        imgUrl,
      hidden:     false,
    };
    cat.products.push(prod); saveShopCatalog(slug, cat);
    return res.json(prod);
  }

  // updateOwnProduct: ...req.body уже содержит cost если фронт его передаёт
  if (req.method === "PUT" && action === "updateOwnProduct") {
    const cat = getShopCatalog(slug);
    const idx = cat.products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).end();
    let imgUrl = cat.products[idx].img;
    if (req.body.img === null) imgUrl = null;
    else if (req.body.img?.startsWith("data:")) imgUrl = await saveBase64Image(req.body.img);
    cat.products[idx] = { ...cat.products[idx], ...req.body, img: imgUrl };
    // cost из req.body попадёт автоматически через spread ↑
    saveShopCatalog(slug, cat); return res.json(cat.products[idx]);
  }

  if (req.method === "DELETE" && action === "deleteOwnProduct") {
    const cat = getShopCatalog(slug);
    cat.products = cat.products.filter(p => p.id !== id);
    saveShopCatalog(slug, cat); return res.json({ ok: true });
  }

  // ── orders ───────────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "createOrder") {
    const orders = getShopOrders(slug);
    const oid = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
    const order = { id: oid, date: new Date().toLocaleString("ru"), client: req.body.client, tg: (req.body.tg||"").replace(/^@/,""), comment: req.body.comment||"", items: req.body.items, total: req.body.total, status: "Новый" };
    orders.unshift(order); saveShopOrders(slug, orders);
    return res.json(order);
  }
  if (req.method === "PUT" && action === "updateOrder") {
    const orders = getShopOrders(slug);
    const idx = orders.findIndex(o => o.id === Number(req.body.id));
    if (idx === -1) return res.status(404).end();
    orders[idx] = { ...orders[idx], ...req.body };
    saveShopOrders(slug, orders); return res.json(orders[idx]);
  }
  if (req.method === "DELETE" && action === "deleteOrder") {
    let orders = getShopOrders(slug);
    orders = orders.filter(o => o.id !== Number(id));
    saveShopOrders(slug, orders); return res.json({ ok: true });
  }

  res.status(405).end();
}
