import { getCatalog, saveCatalog, saveBase64Image, isValidStoredImageUrl } from "@/lib/db";
import { isSuperAdmin } from "@/lib/auth";
import { apiLimiter } from "@/lib/rateLimit";
import { auditLog, getClientIp } from "@/lib/auditLog";
import { sanitizeName, parsePositiveNumber, parseNonNegativeInt } from "@/lib/validate";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

/**
 * /api/admin/catalog — shared catalog management (super-admin only)
 *
 * Security measures:
 *   - All write operations require super-admin cookie authentication
 *   - Rate limited to 100 req / 15 min
 *   - Input validation and sanitization on all write operations
 *   - Image URLs validated to be Cloudinary or local /uploads/ only
 *   - Audit logging for all mutations
 */
export default async function handler(req, res) {
  // Rate limiting
  if (!apiLimiter(req, res)) return;

  // GET is public (storefront needs catalog data) — writes require auth
  if (req.method !== "GET" && !isSuperAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ip = getClientIp(req);

  if (req.method === "GET") return res.json(getCatalog());

  const catalog = getCatalog();

  if (req.method === "POST") {
    const { action } = req.query;

    if (action === "addCategory") {
      const name = sanitizeName(req.body?.name || "");
      if (!name) return res.status(400).json({ error: "Category name is required" });

      // Validate parentId references an existing category (or is null)
      const parentId = req.body?.parentId || null;
      if (parentId && !catalog.categories.find(c => c.id === parentId)) {
        return res.status(400).json({ error: "Invalid parent category" });
      }

      const cat = { id: uuid(), name, parentId };
      catalog.categories.push(cat);
      saveCatalog(catalog);
      auditLog({ actor: "superadmin", action: "addCategory", target: cat.id, ip, meta: { name } });
      return res.json(cat);
    }

    if (action === "addProduct") {
      const name = sanitizeName(req.body?.name || "");
      if (!name) return res.status(400).json({ error: "Product name is required" });

      const basePrice = parsePositiveNumber(req.body?.basePrice);
      if (basePrice === null) return res.status(400).json({ error: "Invalid price" });

      const stock = parseNonNegativeInt(req.body?.stock) ?? 0;

      // Validate categoryId references an existing category
      const categoryId = req.body?.categoryId;
      if (!categoryId || !catalog.categories.find(c => c.id === categoryId)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      // Security: only accept base64 data URIs for upload (validated in saveBase64Image)
      const imgUrl = await saveBase64Image(req.body?.img);

      const prod = {
        id: uuid(),
        categoryId,
        name,
        basePrice,
        img: imgUrl,
        hidden: false,
        stock,
      };
      catalog.products.push(prod);
      saveCatalog(catalog);
      auditLog({ actor: "superadmin", action: "addProduct", target: prod.id, ip, meta: { name } });
      return res.json(prod);
    }
  }

  if (req.method === "PUT") {
    const { action, id } = req.query;
    if (action === "updateProduct") {
      const idx = catalog.products.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).end();

      const updates = {};

      if (req.body?.name !== undefined) {
        const name = sanitizeName(req.body.name);
        if (!name) return res.status(400).json({ error: "Product name is required" });
        updates.name = name;
      }
      if (req.body?.basePrice !== undefined) {
        const basePrice = parsePositiveNumber(req.body.basePrice);
        if (basePrice === null) return res.status(400).json({ error: "Invalid price" });
        updates.basePrice = basePrice;
      }
      if (req.body?.stock !== undefined) {
        const stock = parseNonNegativeInt(req.body.stock);
        if (stock === null) return res.status(400).json({ error: "Invalid stock" });
        updates.stock = stock;
      }
      if (req.body?.hidden !== undefined) {
        updates.hidden = Boolean(req.body.hidden);
      }

      // Image update: null removes it, data URI uploads it, existing URL must be validated
      let imgUrl = catalog.products[idx].img;
      if (req.body?.img === null) {
        imgUrl = null;
      } else if (req.body?.img?.startsWith("data:image/")) {
        imgUrl = await saveBase64Image(req.body.img);
      } else if (req.body?.img !== undefined) {
        // Validate that any provided URL is from an allowed source
        if (!isValidStoredImageUrl(req.body.img)) {
          return res.status(400).json({ error: "Invalid image URL" });
        }
        imgUrl = req.body.img;
      }

      catalog.products[idx] = { ...catalog.products[idx], ...updates, img: imgUrl };
      saveCatalog(catalog);
      auditLog({ actor: "superadmin", action: "updateProduct", target: id, ip });
      return res.json(catalog.products[idx]);
    }
  }

  if (req.method === "DELETE") {
    const { action, id } = req.query;
    if (action === "deleteCategory") {
      const toDelete = [];
      const q = [id];
      while (q.length) {
        const cid = q.shift(); toDelete.push(cid);
        catalog.categories.filter(c => c.parentId === cid).forEach(c => q.push(c.id));
      }
      catalog.categories = catalog.categories.filter(c => !toDelete.includes(c.id));
      catalog.products   = catalog.products.filter(p => !toDelete.includes(p.categoryId));
      saveCatalog(catalog);
      auditLog({ actor: "superadmin", action: "deleteCategory", target: id, ip, meta: { cascade: toDelete } });
      return res.json({ deleted: toDelete });
    }
    if (action === "deleteProduct") {
      if (!catalog.products.find(p => p.id === id)) return res.status(404).end();
      catalog.products = catalog.products.filter(p => p.id !== id);
      saveCatalog(catalog);
      auditLog({ actor: "superadmin", action: "deleteProduct", target: id, ip });
      return res.json({ ok: true });
    }
  }

  res.status(405).end();
}
