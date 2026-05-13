import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA = path.join(process.cwd(), "data");
const PUB  = path.join(process.cwd(), "public", "uploads");

// Bcrypt cost factor — 12 rounds is a good balance of security vs. speed
const BCRYPT_ROUNDS = 12;

function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function read(fp) {
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    // Return null on parse error rather than crashing
    return null;
  }
}

/**
 * Atomic write: write to a temp file first, then rename into place.
 * This prevents partial writes / race conditions from corrupting JSON files.
 * Security: addresses race condition vulnerability (OWASP A04).
 */
function write(fp, data) {
  ensure(path.dirname(fp));
  const tmp = fp + ".tmp." + process.pid;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, fp); // atomic on POSIX systems
  } catch (err) {
    // Clean up temp file on failure
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

// ── Password hashing (bcrypt) ─────────────────────────────────────────────────

/**
 * Hash a plaintext password using bcrypt.
 * Security: replaces plaintext storage (OWASP A02).
 */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 * Also handles legacy plaintext passwords for backward compatibility:
 * if the stored value is not a bcrypt hash, falls back to direct comparison
 * and upgrades the password to a hash on success.
 *
 * @param {string} plaintext - The password to check
 * @param {string} stored    - The stored hash (or legacy plaintext)
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, stored) {
  if (!plaintext || !stored) return false;

  // Detect bcrypt hash by its $2b$ / $2a$ prefix
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    return bcrypt.compare(plaintext, stored);
  }

  // Legacy plaintext comparison (backward compatibility)
  return plaintext === stored;
}

// ─── shared catalog ───────────────────────────────────────────────────────────
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
        { id: "p1", categoryId: "cat2", name: "Шайба ZX-100",       basePrice: 180, stock: 0, img: null, hidden: false },
        { id: "p2", categoryId: "cat2", name: "Шайба Arctic Frost",  basePrice: 220, stock: 0, img: null, hidden: false },
        { id: "p3", categoryId: "cat3", name: "D.L.T.A Mint Strong", basePrice: 290, stock: 0, img: null, hidden: false },
        { id: "p4", categoryId: "cat3", name: "D.L.T.A Black Ice",   basePrice: 260, stock: 0, img: null, hidden: false },
        { id: "p5", categoryId: "cat2", name: "Шайба Volcano",       basePrice: 155, stock: 0, img: null, hidden: false },
      ],
    });
  }
  return read(path.join(DATA, "catalog.json"));
}
export function saveCatalog(data) { write(path.join(DATA, "catalog.json"), data); }

// ─── shops list ───────────────────────────────────────────────────────────────
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

// ─── per-shop ─────────────────────────────────────────────────────────────────
function shopDir(slug) { return path.join(DATA, "shop-" + slug); }

export function getShopSettings(slug) {
  const fp = path.join(shopDir(slug), "settings.json");
  if (!read(fp)) {
    write(fp, {
      name: "Мой магазин",
      logoText: "ММ",
      logoImg: null,
      whatsapp: "79001234567",
      // useSharedCatalog: true — использовать общий каталог
      // useSharedCatalog: false — использовать свой каталог магазина
      useSharedCatalog: true,
    });
  }
  return read(fp);
}
export function saveShopSettings(slug, data) {
  write(path.join(shopDir(slug), "settings.json"), data);
}

// ─── shop prices (overrides for shared catalog) ───────────────────────────────
export function getShopPrices(slug) {
  const fp = path.join(shopDir(slug), "prices.json");
  if (!read(fp)) write(fp, {});
  return read(fp);
}
export function saveShopPrices(slug, data) {
  write(path.join(shopDir(slug), "prices.json"), data);
}

// ─── shop own catalog (when useSharedCatalog=false) ───────────────────────────
export function getShopCatalog(slug) {
  const fp = path.join(shopDir(slug), "catalog.json");
  if (!read(fp)) write(fp, { categories: [], products: [] });
  return read(fp);
}
export function saveShopCatalog(slug, data) {
  write(path.join(shopDir(slug), "catalog.json"), data);
}

// ─── orders ───────────────────────────────────────────────────────────────────
export function getShopOrders(slug) {
  const fp = path.join(shopDir(slug), "orders.json");
  if (!read(fp)) write(fp, []);
  return read(fp);
}
export function saveShopOrders(slug, data) {
  write(path.join(shopDir(slug), "orders.json"), data);
}

// ─── image upload via Cloudinary ──────────────────────────────────────────────

/**
 * Validate that a stored image URL is from Cloudinary or a local /uploads/ path.
 * Security: prevents arbitrary external URLs from being stored (SSRF / content injection).
 */
export function isValidStoredImageUrl(url) {
  if (!url) return true;
  if (typeof url !== "string") return false;
  if (url.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "res.cloudinary.com" ||
        parsed.hostname.endsWith(".cloudinary.com"))
    );
  } catch {
    return false;
  }
}

export async function saveBase64Image(base64) {
  // Security: only accept base64 data URIs — reject arbitrary URLs
  if (!base64 || !base64.startsWith("data:image/")) return null;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const m = base64.match(/^data:(.+);base64,(.+)$/);
    if (!m) return null;
    const { v4: uuidv4 } = require("uuid");
    const filename = uuidv4() + "." + (m[1].split("/")[1] || "jpg");
    ensure(PUB);
    fs.writeFileSync(path.join(PUB, filename), Buffer.from(m[2], "base64"));
    return "/uploads/" + filename;
  }

  const crypto    = require("crypto");
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`folder=b2bshop&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const body = new URLSearchParams({
    file: base64, timestamp: String(timestamp),
    api_key: apiKey, signature, folder: "b2bshop",
  });

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
  const json = await res.json();
  if (json.secure_url) return json.secure_url;
  console.error("Cloudinary error:", json);
  return null;
}

// ─── get merged products for storefront ──────────────────────────────────────
// If shop uses shared catalog: base products + shop price/stock overrides
// If shop uses own catalog: just the shop's own products
export function getMergedProducts(slug) {
  const settings = getShopSettings(slug);

  if (!settings.useSharedCatalog) {
    // own catalog — return as-is, no merging needed
    const { products } = getShopCatalog(slug);
    return products.filter(p => !p.hidden);
  }

  // shared catalog with per-shop overrides
  const { products } = getCatalog();
  const prices = getShopPrices(slug);
  return products
    .filter(p => !p.hidden)
    .map(p => {
      const ov = prices[p.id] || {};
      return {
        ...p,
        price:  ov.price  !== undefined ? ov.price  : p.basePrice,
        // FIX: use shop override stock if set, otherwise use catalog stock
        stock:  ov.stock  !== undefined ? ov.stock  : (p.stock || 0),
        hidden: ov.hidden !== undefined ? ov.hidden : false,
      };
    })
    .filter(p => !p.hidden);
}

// ─── get categories for storefront ────────────────────────────────────────────
export function getMergedCategories(slug) {
  const settings = getShopSettings(slug);
  if (!settings.useSharedCatalog) {
    return getShopCatalog(slug).categories;
  }
  return getCatalog().categories;
}
