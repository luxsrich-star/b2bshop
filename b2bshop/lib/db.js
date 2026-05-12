import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const DATA = path.join(process.cwd(), "data");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function read(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}
function write(fp, data) {
  ensure(path.dirname(fp));
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

// ─── catalog (shared) ────────────────────────────────────────────────────────
export function getCatalog() {
  ensure(DATA);
  const fp = path.join(DATA, "catalog.json");
  if (!read(fp)) {
    write(fp, {
      categories: [
        { id: "cat1", name: "Каталог",  parentId: null },
        { id: "cat2", name: "Шайбы",    parentId: "cat1" },
        { id: "cat3", name: "D.L.T.A",  parentId: "cat1" },
      ],
      products: [
        { id: "p1", categoryId: "cat2", name: "Шайба ZX-100",      basePrice: 180, img: null, hidden: false },
        { id: "p2", categoryId: "cat2", name: "Шайба Arctic Frost", basePrice: 220, img: null, hidden: false },
        { id: "p3", categoryId: "cat3", name: "D.L.T.A Mint Strong",basePrice: 290, img: null, hidden: false },
        { id: "p4", categoryId: "cat3", name: "D.L.T.A Black Ice",  basePrice: 260, img: null, hidden: false },
        { id: "p5", categoryId: "cat2", name: "Шайба Volcano",      basePrice: 155, img: null, hidden: false },
      ],
    });
  }
  return read(path.join(DATA, "catalog.json"));
}
export function saveCatalog(data) { write(path.join(DATA, "catalog.json"), data); }

// ─── shops list ──────────────────────────────────────────────────────────────
export function getShops() {
  ensure(DATA);
  const fp = path.join(DATA, "shops.json");
  if (!read(fp)) {
    write(fp, [
      { slug: "opt",     name: "Оптовый магазин", password: "opt123",    blocked: false },
      { slug: "roznica", name: "Розница",          password: "roz123",    blocked: false },
    ]);
  }
  return read(path.join(DATA, "shops.json"));
}
export function saveShops(data) { write(path.join(DATA, "shops.json"), data); }

// ─── per-shop helpers ─────────────────────────────────────────────────────────
function shopDir(slug) { return path.join(DATA, "shop-" + slug); }

export function getShopSettings(slug) {
  const fp = path.join(shopDir(slug), "settings.json");
  if (!read(fp)) {
    write(fp, { name: "Мой магазин", logoText: "ММ", logoImg: null, whatsapp: "79001234567" });
  }
  return read(fp);
}
export function saveShopSettings(slug, data) {
  write(path.join(shopDir(slug), "settings.json"), data);
}

export function getShopPrices(slug) {
  // { productId: { price, stock, hidden } }
  const fp = path.join(shopDir(slug), "prices.json");
  if (!read(fp)) write(fp, {});
  return read(fp);
}
export function saveShopPrices(slug, data) {
  write(path.join(shopDir(slug), "prices.json"), data);
}

export function getShopOrders(slug) {
  const fp = path.join(shopDir(slug), "orders.json");
  if (!read(fp)) write(fp, []);
  return read(fp);
}
export function saveShopOrders(slug, data) {
  write(path.join(shopDir(slug), "orders.json"), data);
}

// ─── image save ───────────────────────────────────────────────────────────────
export async function saveBase64Image(base64) {
  if (!base64 || !base64.startsWith("data:")) return null;
  try {
    const result = await cloudinary.uploader.upload(base64, {
      folder: "b2bshop",
    });
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return null;
  }
}

// ─── merged products for shop (base + overrides) ─────────────────────────────
export function getMergedProducts(slug) {
  const { products } = getCatalog();
  const prices = getShopPrices(slug);
  return products
    .filter(p => !p.hidden)
    .map(p => {
      const ov = prices[p.id] || {};
      return {
        ...p,
        price:  ov.price  ?? p.basePrice,
        stock:  ov.stock  ?? 0,
        hidden: ov.hidden ?? false,
      };
    })
    .filter(p => !p.hidden);
}
