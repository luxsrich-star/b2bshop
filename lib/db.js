import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data");
const PUB  = path.join(process.cwd(), "public", "uploads");

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
        { id: "p1", categoryId: "cat2", name: "Шайба ZX-100",       basePrice: 180, img: null, hidden: false },
        { id: "p2", categoryId: "cat2", name: "Шайба Arctic Frost",  basePrice: 220, img: null, hidden: false },
        { id: "p3", categoryId: "cat3", name: "D.L.T.A Mint Strong", basePrice: 290, img: null, hidden: false },
        { id: "p4", categoryId: "cat3", name: "D.L.T.A Black Ice",   basePrice: 260, img: null, hidden: false },
        { id: "p5", categoryId: "cat2", name: "Шайба Volcano",       basePrice: 155, img: null, hidden: false },
      ],
    });
  }
  return read(path.join(DATA, "catalog.json"));
}
export function saveCatalog(data) { write(path.join(DATA, "catalog.json"), data); }

export function getShops() {
  ensure(DATA);
  const fp = path.join(DATA, "shops.json");
  if (!read(fp)) {
    write(fp, [
      { slug: "opt",     name: "Оптовый магазин", password: "opt123", blocked: false },
      { slug: "roznica", name: "Розница",          password: "roz123", blocked: false },
    ]);
  }
  return read(path.join(DATA, "shops.json"));
}
export function saveShops(data) { write(path.join(DATA, "shops.json"), data); }

function shopDir(slug) { return path.join(DATA, "shop-" + slug); }

export function getShopSettings(slug) {
  const fp = path.join(shopDir(slug), "settings.json");
  if (!read(fp)) write(fp, { name: "Мой магазин", logoText: "ММ", logoImg: null, whatsapp: "79001234567" });
  return read(fp);
}
export function saveShopSettings(slug, data) {
  write(path.join(shopDir(slug), "settings.json"), data);
}

export function getShopPrices(slug) {
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

// ─── image upload via Cloudinary ──────────────────────────────────────────────
export async function saveBase64Image(base64) {
  if (!base64 || !base64.startsWith("data:")) return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // fallback: save locally if cloudinary not configured
  if (!cloudName || !apiKey || !apiSecret) {
    const m = base64.match(/^data:(.+);base64,(.+)$/);
    if (!m) return null;
    const { v4: uuidv4 } = require("uuid");
    const filename = uuidv4() + "." + (m[1].split("/")[1] || "jpg");
    ensure(PUB);
    fs.writeFileSync(path.join(PUB, filename), Buffer.from(m[2], "base64"));
    return "/uploads/" + filename;
  }

  // upload to Cloudinary via REST (no SDK needed)
  const crypto    = require("crypto");
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`folder=b2bshop&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    file:      base64,
    timestamp: String(timestamp),
    api_key:   apiKey,
    signature,
    folder:    "b2bshop",
  });

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (json.secure_url) return json.secure_url;
  console.error("Cloudinary upload error:", json);
  return null;
}

// ─── merged products for shop ─────────────────────────────────────────────────
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
