/**
 * Input validation and sanitization helpers.
 *
 * Security: prevents XSS, injection, and malformed data (OWASP A03).
 * All user-supplied strings are sanitized before being stored or returned.
 */

// ── String sanitization ───────────────────────────────────────────────────────

/**
 * Strip HTML tags and dangerous characters from a string.
 * Lightweight alternative to a full sanitize-html library.
 * Removes: <tags>, script content, null bytes, and control characters.
 */
export function sanitizeString(str, maxLength = 500) {
  if (typeof str !== "string") return "";
  return str
    .slice(0, maxLength)
    .replace(/\0/g, "")                          // null bytes
    .replace(/<[^>]*>/g, "")                     // HTML tags
    .replace(/javascript\s*:/gi, "")             // javascript: URIs
    .replace(/on\w+\s*=/gi, "")                  // inline event handlers
    .trim();
}

/**
 * Sanitize a name field (product name, category name, shop name).
 * Allows letters, digits, spaces, and common punctuation.
 */
export function sanitizeName(str, maxLength = 200) {
  return sanitizeString(str, maxLength);
}

/**
 * Sanitize a slug: only lowercase alphanumeric, hyphens, underscores.
 */
export function sanitizeSlug(str) {
  if (typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

/**
 * Sanitize a Telegram username.
 * Telegram rules: 5–32 chars, alphanumeric + underscore, no leading digit.
 * Returns the cleaned username (without @) or null if invalid.
 */
export function sanitizeTelegram(str) {
  if (!str || typeof str !== "string") return "";
  // Strip leading @
  const clean = str.replace(/^@/, "").trim();
  // Validate format: 5-32 chars, alphanumeric + underscore
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(clean)) return null;
  return clean;
}

/**
 * Validate a Telegram username strictly.
 * Returns true if valid, false otherwise.
 */
export function isValidTelegram(str) {
  if (!str || typeof str !== "string") return false;
  const clean = str.replace(/^@/, "").trim();
  return /^[a-zA-Z0-9_]{5,32}$/.test(clean);
}

/**
 * Sanitize a phone number (digits, +, spaces, dashes, parens only).
 */
export function sanitizePhone(str, maxLength = 20) {
  if (typeof str !== "string") return "";
  return str.replace(/[^0-9+\s\-()]/g, "").slice(0, maxLength).trim();
}

/**
 * Sanitize a comment / free-text field.
 * Strips HTML but allows most printable characters.
 */
export function sanitizeComment(str, maxLength = 1000) {
  return sanitizeString(str, maxLength);
}

// ── Number validation ─────────────────────────────────────────────────────────

/**
 * Parse and validate a non-negative number.
 * Returns the number, or null if invalid.
 */
export function parsePositiveNumber(val) {
  const n = Number(val);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Parse and validate a positive integer (for stock counts, etc.).
 */
export function parseNonNegativeInt(val) {
  const n = parseInt(val, 10);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

// ── URL / Image validation ────────────────────────────────────────────────────

/**
 * Validate that a URL is a legitimate Cloudinary URL or a local /uploads/ path.
 * Rejects arbitrary external URLs to prevent SSRF and content injection.
 */
export function isValidImageUrl(url) {
  if (!url) return true; // null/undefined is allowed (no image)
  if (typeof url !== "string") return false;

  // Allow local uploads (fallback when Cloudinary is not configured)
  if (url.startsWith("/uploads/")) return true;

  // Allow Cloudinary URLs only
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

/**
 * Validate that an image value is either:
 *   - null (remove image)
 *   - a base64 data URI (for upload)
 *   - a valid Cloudinary/local URL (already uploaded)
 */
export function isValidImageInput(val) {
  if (val === null || val === undefined) return true;
  if (typeof val !== "string") return false;
  if (val.startsWith("data:image/")) return true; // base64 upload
  return isValidImageUrl(val);
}

// ── Password validation ───────────────────────────────────────────────────────

/**
 * Validate password strength.
 * Minimum 8 characters. Returns error message or null if valid.
 */
export function validatePassword(password) {
  if (typeof password !== "string") return "Password must be a string";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  return null;
}

// ── Order validation ──────────────────────────────────────────────────────────

/**
 * Validate order items array.
 * Each item must have: name (string), qty (positive int), price (positive number).
 */
export function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "Order must have at least one item";
  if (items.length > 500) return "Too many items in order";

  for (const item of items) {
    if (!item || typeof item !== "object") return "Invalid item format";
    if (!item.name || typeof item.name !== "string" || item.name.length > 200) return "Invalid item name";
    const qty = parseNonNegativeInt(item.qty);
    if (qty === null || qty < 1) return "Invalid item quantity";
    const price = parsePositiveNumber(item.price);
    if (price === null) return "Invalid item price";
  }
  return null;
}
