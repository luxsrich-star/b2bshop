import {
  getShops, getShopSettings, saveShopSettings,
  getShopPrices, saveShopPrices,
  getShopOrders, saveShopOrders,
  getShopCatalog, saveShopCatalog,
  getCatalog, saveBase64Image, isValidStoredImageUrl
} from "@/lib/db";
import { isSuperAdmin, isShopAuthed } from "@/lib/auth";
import { apiLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";
import {
  sanitizeName, sanitizeComment, sanitizePhone,
  sanitizeTelegram, isValidTelegram,
  parsePositiveNumber, parseNonNegativeInt,
  validateOrderItems
} from "@/lib/validate";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

/**
 * Determine if the requester is authorized to access/modify this shop's data.
 * Access control rules:
 *   - Super-admin can access any shop
 *   - Shop owner (authenticated via shop cookie) can only access their own shop
 *
 * Security: prevents horizontal privilege escalation (OWASP A01).
 */
function isAuthorized(req, slug) {
  return isSuperAdmin(req) || isShopAuthed(req, slug);
}

function shopExists(slug) { return !!getShops().find(s => s.slug === slug); }

/**
 * /api/admin/shop-data — per-shop data management
 *
 * Security measures:
 *   - All operations require authentication (super-admin OR shop owner)
 *   - Access control: shop owners can only modify their own shop
 *   - Rate limited to 100 req / 15 min
 *   - Input validation and sanitization on all write operations
 *   - Telegram username validated to Telegram format rules
 *   - Image URLs validated to Cloudinary/local only
 *   - Audit logging for all mutations
 */
export default async function handler(req, res) {
  // Rate limiting
  if (!apiLimiter(req, res)) return;

  const { slug, action } = req.query;

  // Validate slug format before any file system access
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid shop identifier" });
  }

  if (!shopExists(slug)) return res.status(404).json({ error: "Магазин не найден" });

  // Authentication and access control check
  if (!isAuthorized(req, slug)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ip = getClientIp(req);
  // Determine actor for audit log
  const actor = isSuperAdmin(req) ? "superadmin" : `shop:${slug}`;

  // GET all data
  if (req.method === "GET") {
    return res.json({
      settings:    getShopSettings(slug),
      prices:      getShopPrices(slug),
      orders:      getShopOrders(slug),
      sharedCatalog: getCatalog(),
      ownCatalog:  getShopCatalog(slug),
    });
  }

  // ── settings ──────────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "saveSettings") {
    const current = getShopSettings(slug);

    // Whitelist allowed settings fields and sanitize each
    const updates = {};
    if (req.body?.name !== undefined) updates.name = sanitizeName(req.body.name);
    if (req.body?.logoText !== undefined) updates.logoText = sanitizeName(req.body.logoText, 3);
    if (req.body?.whatsapp !== undefined) updates.whatsapp = sanitizePhone(req.body.whatsapp);
    if (req.body?.useSharedCatalog !== undefined) updates.useSharedCatalog = Boolean(req.body.useSharedCatalog);

    // Logo image: null removes it, data URI uploads it
    let logoImg = current.logoImg;
    if (req.body?.logoImg === null) {
      logoImg = null;
    } else if (req.body?.logoImg?.startsWith("data:image/")) {
      logoImg = await saveBase64Image(req.body.logoImg);
    } else if (req.body?.logoImg !== undefined) {
      if (!isValidStoredImageUrl(req.body.logoImg)) {
        return res.status(400).json({ error: "Invalid logo image URL" });
      }
      logoImg = req.body.logoImg;
    }

    const updated = { ...current, ...updates, logoImg };
    saveShopSettings(slug, updated);
    auditLog({ actor, action: "saveSettings", target: slug, ip });
    return res.json(updated);
  }

  // ── price override (shared catalog mode) ──────────────────────────────────
  if (req.method === "POST" && action === "savePrice") {
    const prices = getShopPrices(slug);
    const { productId, price, stock, hidden } = req.body || {};

    // Validate productId exists in the shared catalog
    const catalog = getCatalog();
    if (!productId || !catalog.products.find(p => p.id === productId)) {
      return res.status(400).json({ error: "Invalid product" });
    }

    prices[productId] = {};
    if (price !== undefined) {
      const p = parsePositiveNumber(price);
      if (p === null) return res.status(400).json({ error: "Invalid price" });
      prices[productId].price = p;
    }
    if (stock !== undefined) {
      const s = parseNonNegativeInt(stock);
      if (s === null) return res.status(400).json({ error: "Invalid stock" });
      prices[productId].stock = s;
    }
    if (hidden !== undefined) prices[productId].hidden = Boolean(hidden);

    saveShopPrices(slug, prices);
    auditLog({ actor, action: "savePrice", target: slug, ip, meta: { productId } });
    return res.json({ ok: true });
  }

  // ── own catalog: add category ──────────────────────────────────────────────
  if (req.method === "POST" && action === "addOwnCategory") {
    const name = sanitizeName(req.body?.name || "");
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const cat = getShopCatalog(slug);
    const parentId = req.body?.parentId || null;
    if (parentId && !cat.categories.find(c => c.id === parentId)) {
      return res.status(400).json({ error: "Invalid parent category" });
    }

    const newCat = { id: uuid(), name, parentId };
    cat.categories.push(newCat);
    saveShopCatalog(slug, cat);
    auditLog({ actor, action: "addOwnCategory", target: slug, ip, meta: { name } });
    return res.json(newCat);
  }

  // ── own catalog: delete category ──────────────────────────────────────────
  if (req.method === "DELETE" && action === "deleteOwnCategory") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Category id required" });

    const cat = getShopCatalog(slug);
    if (!cat.categories.find(c => c.id === id)) return res.status(404).end();

    const toDelete = [];
    const q = [id];
    while (q.length) {
      const cid = q.shift(); toDelete.push(cid);
      cat.categories.filter(c => c.parentId === cid).forEach(c => q.push(c.id));
    }
    cat.categories = cat.categories.filter(c => !toDelete.includes(c.id));
    cat.products   = cat.products.filter(p => !toDelete.includes(p.categoryId));
    saveShopCatalog(slug, cat);
    auditLog({ actor, action: "deleteOwnCategory", target: slug, ip, meta: { id, cascade: toDelete } });
    return res.json({ deleted: toDelete });
  }

  // ── own catalog: add product ───────────────────────────────────────────────
  if (req.method === "POST" && action === "addOwnProduct") {
    const name = sanitizeName(req.body?.name || "");
    if (!name) return res.status(400).json({ error: "Product name is required" });

    const price = parsePositiveNumber(req.body?.price);
    if (price === null) return res.status(400).json({ error: "Invalid price" });

    const stock = parseNonNegativeInt(req.body?.stock) ?? 0;

    const cat = getShopCatalog(slug);
    const categoryId = req.body?.categoryId;
    if (!categoryId || !cat.categories.find(c => c.id === categoryId)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const imgUrl = await saveBase64Image(req.body?.img);
    const prod = {
      id: uuid(),
      categoryId,
      name,
      price,
      basePrice: price,
      stock,
      img: imgUrl,
      hidden: false,
    };
    cat.products.push(prod);
    saveShopCatalog(slug, cat);
    auditLog({ actor, action: "addOwnProduct", target: slug, ip, meta: { name } });
    return res.json(prod);
  }

  // ── own catalog: update product ────────────────────────────────────────────
  if (req.method === "PUT" && action === "updateOwnProduct") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Product id required" });

    const cat = getShopCatalog(slug);
    const idx = cat.products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).end();

    const updates = {};
    if (req.body?.name !== undefined) {
      const name = sanitizeName(req.body.name);
      if (!name) return res.status(400).json({ error: "Product name is required" });
      updates.name = name;
    }
    if (req.body?.price !== undefined) {
      const price = parsePositiveNumber(req.body.price);
      if (price === null) return res.status(400).json({ error: "Invalid price" });
      updates.price = price;
      updates.basePrice = price;
    }
    if (req.body?.stock !== undefined) {
      const stock = parseNonNegativeInt(req.body.stock);
      if (stock === null) return res.status(400).json({ error: "Invalid stock" });
      updates.stock = stock;
    }
    if (req.body?.hidden !== undefined) updates.hidden = Boolean(req.body.hidden);

    let imgUrl = cat.products[idx].img;
    if (req.body?.img === null) {
      imgUrl = null;
    } else if (req.body?.img?.startsWith("data:image/")) {
      imgUrl = await saveBase64Image(req.body.img);
    } else if (req.body?.img !== undefined) {
      if (!isValidStoredImageUrl(req.body.img)) {
        return res.status(400).json({ error: "Invalid image URL" });
      }
      imgUrl = req.body.img;
    }

    cat.products[idx] = { ...cat.products[idx], ...updates, img: imgUrl };
    saveShopCatalog(slug, cat);
    auditLog({ actor, action: "updateOwnProduct", target: slug, ip, meta: { id } });
    return res.json(cat.products[idx]);
  }

  // ── own catalog: delete product ────────────────────────────────────────────
  if (req.method === "DELETE" && action === "deleteOwnProduct") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Product id required" });

    const cat = getShopCatalog(slug);
    if (!cat.products.find(p => p.id === id)) return res.status(404).end();

    cat.products = cat.products.filter(p => p.id !== id);
    saveShopCatalog(slug, cat);
    auditLog({ actor, action: "deleteOwnProduct", target: slug, ip, meta: { id } });
    return res.json({ ok: true });
  }

  // ── orders ─────────────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "createOrder") {
    const client = sanitizeName(req.body?.client || "");
    if (!client) return res.status(400).json({ error: "Client name is required" });

    // Telegram username validation (OWASP A03 — injection prevention)
    const rawTg = (req.body?.tg || "").replace(/^@/, "");
    if (rawTg && !isValidTelegram(rawTg)) {
      return res.status(400).json({ error: "Invalid Telegram username (5-32 chars, alphanumeric + underscore)" });
    }
    const tg = rawTg ? sanitizeTelegram(rawTg) : "";

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
      tg: tg || "",
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
    auditLog({ actor, action: "createOrder", target: slug, ip, meta: { orderId: id, total } });
    return res.json(order);
  }

  if (req.method === "PUT" && action === "updateOrder") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Order id required" });

    const orders = getShopOrders(slug);
    const idx = orders.findIndex(o => o.id === Number(id));
    if (idx === -1) return res.status(404).end();

    // Only allow status updates from the admin panel (whitelist)
    const VALID_STATUSES = ["Новый", "В обработке", "Выполнен", "Отмена"];
    const updates = {};
    if (req.body?.status !== undefined) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      updates.status = req.body.status;
    }

    orders[idx] = { ...orders[idx], ...updates };
    saveShopOrders(slug, orders);
    auditLog({ actor, action: "updateOrder", target: slug, ip, meta: { orderId: id, status: updates.status } });
    return res.json(orders[idx]);
  }

  res.status(405).end();
}
