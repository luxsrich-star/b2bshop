import {
  getShops, getShopSettings, saveShopSettings,
  getShopPrices, saveShopPrices,
  getShopOrders, saveShopOrders,
  getShopCatalog, saveShopCatalog,
  getShopLog, saveShopLog, addLogEntry,
  getCatalog, saveCatalog,
  saveBase64Image
} from "@/lib/db";
import { v4 as uuid } from "uuid";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

function shopExists(slug) { return !!getShops().find(s => s.slug === slug); }

export default async function handler(req, res) {
  const { slug, action, id } = req.query;
  if (!shopExists(slug)) return res.status(404).json({ error: "Магазин не найден" });

  if (req.method === "GET") {
    return res.json({
      settings:      getShopSettings(slug),
      prices:        getShopPrices(slug),
      orders:        getShopOrders(slug),
      sharedCatalog: getCatalog(),
      ownCatalog:    getShopCatalog(slug),
      log:           getShopLog(slug),
    });
  }

  // ── settings ──────────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "saveSettings") {
    const current = getShopSettings(slug);
    let logoImg = current.logoImg;
    if (req.body.logoImg === null) logoImg = null;
    else if (req.body.logoImg?.startsWith("data:")) logoImg = await saveBase64Image(req.body.logoImg);
    const updated = { ...current, ...req.body, logoImg };
    saveShopSettings(slug, updated);
    return res.json(updated);
  }

  // ── price override ─────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "savePrice") {
    const prices = getShopPrices(slug);
    const { productId, price, stock, hidden, cost } = req.body;
    const old = prices[productId] || {};
    prices[productId] = { ...old };
    if (price  !== undefined) prices[productId].price  = Number(price);
    if (stock  !== undefined) prices[productId].stock  = Number(stock);
    if (hidden !== undefined) prices[productId].hidden = Boolean(hidden);
    if (cost   !== undefined) prices[productId].cost   = Number(cost);
    saveShopPrices(slug, prices);
    // log
    if (price !== undefined && old.price !== undefined && old.price !== Number(price)) {
      addLogEntry(slug, { type:"edit", dot:"edit", who:slug, action:"Изменение цены", details:`${req.body.productName||productId}: ${old.price}₽ → ${price}₽` });
    }
    if (stock !== undefined && old.stock !== undefined && old.stock !== Number(stock)) {
      addLogEntry(slug, { type:"edit", dot:"edit", who:slug, action:"Изменение остатка", details:`${req.body.productName||productId}: ${old.stock} → ${stock} шт` });
    }
    return res.json({ ok: true });
  }

  // ── save product order ─────────────────────────────────────────────────────
  if (req.method === "POST" && action === "saveOrder") {
    const { order, catalogType } = req.body; // order = array of product ids
    if (catalogType === "own") {
      const cat = getShopCatalog(slug);
      order.forEach((pid, idx) => {
        const p = cat.products.find(x => x.id === pid);
        if (p) p.order = idx;
      });
      saveShopCatalog(slug, cat);
    } else {
      const cat = getCatalog();
      order.forEach((pid, idx) => {
        const p = cat.products.find(x => x.id === pid);
        if (p) p.order = idx;
      });
      saveCatalog(cat);
    }
    addLogEntry(slug, { type:"move", dot:"move", who:slug, action:"Изменён порядок товаров", details:`${order.length} позиций` });
    return res.json({ ok: true });
  }

  // ── own catalog: add category ──────────────────────────────────────────────
  if (req.method === "POST" && action === "addOwnCategory") {
    const cat = getShopCatalog(slug);
    const newCat = { id:uuid(), name:req.body.name, parentId:req.body.parentId||null };
    cat.categories.push(newCat);
    saveShopCatalog(slug, cat);
    addLogEntry(slug, { type:"add", dot:"add", who:slug, action:"Добавлена категория", details:req.body.name });
    return res.json(newCat);
  }

  if (req.method === "PUT" && action === "updateOwnCategory") {
    const cat = getShopCatalog(slug);
    const idx = cat.categories.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).end();
    const old = cat.categories[idx].name;
    cat.categories[idx] = { ...cat.categories[idx], ...req.body };
    saveShopCatalog(slug, cat);
    if (req.body.name && req.body.name !== old) {
      addLogEntry(slug, { type:"edit", dot:"edit", who:slug, action:"Переименована категория", details:`«${old}» → «${req.body.name}»` });
    }
    return res.json(cat.categories[idx]);
  }

  if (req.method === "DELETE" && action === "deleteOwnCategory") {
    const cat = getShopCatalog(slug);
    const toDelete=[]; const q=[id];
    while(q.length){const cid=q.shift();toDelete.push(cid);cat.categories.filter(c=>c.parentId===cid).forEach(c=>q.push(c.id));}
    const name = cat.categories.find(c=>c.id===id)?.name||id;
    cat.categories = cat.categories.filter(c=>!toDelete.includes(c.id));
    cat.products   = cat.products.filter(p=>!toDelete.includes(p.categoryId));
    saveShopCatalog(slug, cat);
    addLogEntry(slug, { type:"delete", dot:"delete", who:slug, action:"Удалена категория", details:name });
    return res.json({ deleted:toDelete });
  }

  // ── own catalog: products ──────────────────────────────────────────────────
  if (req.method === "POST" && action === "addOwnProduct") {
    const cat = getShopCatalog(slug);
    const imgUrl = await saveBase64Image(req.body.img);
    const maxOrder = cat.products.reduce((m,p)=>Math.max(m,p.order??0),0);
    const prod = {
      id: uuid(),
      categoryId: req.body.categoryId,
      name:       req.body.name,
      price:      Number(req.body.price),
      basePrice:  Number(req.body.price),
      cost:       Number(req.body.cost)||0,
      stock:      Number(req.body.stock)||0,
      img:        imgUrl,
      hidden:     false,
      order:      maxOrder + 1,
    };
    cat.products.push(prod);
    saveShopCatalog(slug, cat);
    addLogEntry(slug, { type:"add", dot:"add", who:slug, action:"Добавлен товар", details:`«${prod.name}» · ${prod.price}₽` });
    return res.json(prod);
  }

  if (req.method === "PUT" && action === "updateOwnProduct") {
    const cat = getShopCatalog(slug);
    const idx = cat.products.findIndex(p=>p.id===id);
    if (idx===-1) return res.status(404).end();
    let imgUrl = cat.products[idx].img;
    if (req.body.img===null) imgUrl=null;
    else if (req.body.img?.startsWith("data:")) imgUrl=await saveBase64Image(req.body.img);
    const old = cat.products[idx];
    cat.products[idx] = { ...old, ...req.body, img:imgUrl };
    saveShopCatalog(slug, cat);
    // log changes
    if (req.body.name && req.body.name!==old.name)
      addLogEntry(slug,{type:"edit",dot:"edit",who:slug,action:"Переименован товар",details:`«${old.name}»→«${req.body.name}»`});
    if (req.body.price!==undefined && Number(req.body.price)!==old.price)
      addLogEntry(slug,{type:"edit",dot:"edit",who:slug,action:"Изменена цена",details:`«${old.name}»: ${old.price}₽→${req.body.price}₽`});
    if (req.body.cost!==undefined && Number(req.body.cost)!==old.cost)
      addLogEntry(slug,{type:"edit",dot:"edit",who:slug,action:"Изменена себестоимость",details:`«${old.name}»: ${old.cost}₽→${req.body.cost}₽`});
    if (req.body.stock!==undefined && Number(req.body.stock)!==old.stock)
      addLogEntry(slug,{type:"edit",dot:"edit",who:slug,action:"Изменён остаток",details:`«${old.name}»: ${old.stock}→${req.body.stock} шт`});
    return res.json(cat.products[idx]);
  }

  if (req.method === "DELETE" && action === "deleteOwnProduct") {
    const cat = getShopCatalog(slug);
    const name = cat.products.find(p=>p.id===id)?.name||id;
    cat.products = cat.products.filter(p=>p.id!==id);
    saveShopCatalog(slug, cat);
    addLogEntry(slug,{type:"delete",dot:"delete",who:slug,action:"Удалён товар",details:`«${name}»`});
    return res.json({ ok:true });
  }

  // ── log ────────────────────────────────────────────────────────────────────
  if (req.method === "DELETE" && action === "deleteLogEntry") {
    const log = getShopLog(slug).filter(e=>e.id!==Number(id));
    saveShopLog(slug, log);
    return res.json({ ok:true });
  }
  if (req.method === "DELETE" && action === "clearLog") {
    saveShopLog(slug, []);
    return res.json({ ok:true });
  }

  // ── orders ─────────────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "createOrder") {
    const orders = getShopOrders(slug);
    const oid = orders.length>0 ? Math.max(...orders.map(o=>o.id))+1 : 1;
    const order = {
      id:oid, date:new Date().toLocaleString("ru"),
      client:req.body.client, tg:(req.body.tg||"").replace(/^@/,""),
      comment:req.body.comment||"", items:req.body.items,
      total:req.body.total, status:"Новый",
    };
    orders.unshift(order);
    saveShopOrders(slug, orders);
    return res.json(order);
  }

  if (req.method === "PUT" && action === "updateOrder") {
    const orders = getShopOrders(slug);
    const idx = orders.findIndex(o=>o.id===Number(req.body.id));
    if (idx===-1) return res.status(404).end();
    orders[idx]={...orders[idx],...req.body};
    saveShopOrders(slug, orders);
    return res.json(orders[idx]);
  }

  if (req.method === "DELETE" && action === "deleteOrder") {
    saveShopOrders(slug, getShopOrders(slug).filter(o=>o.id!==Number(id)));
    return res.json({ ok:true });
  }

  res.status(405).end();
}
