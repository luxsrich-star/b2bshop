import { getCatalog, saveCatalog, saveBase64Image } from "@/lib/db";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  if (req.method === "GET") return res.json(getCatalog());

  const catalog = getCatalog();

  if (req.method === "POST") {
    const { action } = req.query;
    if (action === "addCategory") {
      const cat = { id: uuid(), name: req.body.name, parentId: req.body.parentId || null };
      catalog.categories.push(cat);
      saveCatalog(catalog);
      return res.json(cat);
    }
    if (action === "addProduct") {
      const imgUrl = await saveBase64Image(req.body.img);
      const prod = { id: uuid(), categoryId: req.body.categoryId, name: req.body.name, basePrice: Number(req.body.basePrice), cost: Number(req.body.cost)||0, img: imgUrl, hidden: false, stock: Number(req.body.stock) || 0 };
      catalog.products.push(prod);
      saveCatalog(catalog);
      return res.json(prod);
    }
  }

  if (req.method === "PUT") {
    const { action, id } = req.query;
    if (action === "updateCategory") {
      const idx = catalog.categories.findIndex(c => c.id === id);
      if (idx === -1) return res.status(404).end();
      catalog.categories[idx] = { ...catalog.categories[idx], ...req.body };
      saveCatalog(catalog);
      return res.json(catalog.categories[idx]);
    }
    if (action === "updateProduct") {
      const idx = catalog.products.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).end();
      let imgUrl = catalog.products[idx].img;
      if (req.body.img === null) imgUrl = null;
      else if (req.body.img?.startsWith("data:")) imgUrl = await saveBase64Image(req.body.img);
      catalog.products[idx] = { ...catalog.products[idx], ...req.body, img: imgUrl };
      saveCatalog(catalog);
      return res.json(catalog.products[idx]);
    }
  }

  if (req.method === "DELETE") {
    const { action, id } = req.query;
    if (action === "deleteCategory") {
      const toDelete = []; const q = [id];
      while (q.length) { const cid = q.shift(); toDelete.push(cid); catalog.categories.filter(c => c.parentId === cid).forEach(c => q.push(c.id)); }
      catalog.categories = catalog.categories.filter(c => !toDelete.includes(c.id));
      catalog.products   = catalog.products.filter(p => !toDelete.includes(p.categoryId));
      saveCatalog(catalog);
      return res.json({ deleted: toDelete });
    }
    if (action === "deleteProduct") {
      catalog.products = catalog.products.filter(p => p.id !== id);
      saveCatalog(catalog);
      return res.json({ ok: true });
    }
  }
  res.status(405).end();
}
