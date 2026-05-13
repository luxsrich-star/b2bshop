/**
 * Cookie-based authentication helpers.
 *
 * Security: replaces sessionStorage (client-side, XSS-readable) with
 * httpOnly cookies that JavaScript cannot access (OWASP A07).
 *
 * Cookie flags:
 *   httpOnly  — not accessible via document.cookie (XSS protection)
 *   secure    — only sent over HTTPS (set based on NODE_ENV)
 *   sameSite  — 'strict' prevents CSRF via cross-site requests
 *   path      — scoped to the relevant admin path
 */

import { serialize, parse } from "cookie";

const IS_PROD = process.env.NODE_ENV === "production";

// Cookie names
export const SUPER_ADMIN_COOKIE = "sa_session";
export const SHOP_COOKIE_PREFIX = "shop_session_";

/**
 * Build a Set-Cookie header value for the super-admin session.
 */
export function buildSuperAdminCookie(value) {
  return serialize(SUPER_ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

/**
 * Build a Set-Cookie header value for a shop session.
 */
export function buildShopCookie(slug, value) {
  return serialize(SHOP_COOKIE_PREFIX + slug, value, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: `/admin/${slug}`,
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

/**
 * Clear the super-admin session cookie.
 */
export function clearSuperAdminCookie() {
  return serialize(SUPER_ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Clear a shop session cookie.
 */
export function clearShopCookie(slug) {
  return serialize(SHOP_COOKIE_PREFIX + slug, "", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: `/admin/${slug}`,
    maxAge: 0,
  });
}

/**
 * Parse cookies from an incoming request.
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, string>}
 */
export function parseCookies(req) {
  return parse(req.headers.cookie || "");
}

/**
 * Check if the request carries a valid super-admin session cookie.
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
export function isSuperAdmin(req) {
  const cookies = parseCookies(req);
  return cookies[SUPER_ADMIN_COOKIE] === "authenticated";
}

/**
 * Check if the request carries a valid shop session cookie for `slug`.
 * @param {import('http').IncomingMessage} req
 * @param {string} slug
 * @returns {boolean}
 */
export function isShopAuthed(req, slug) {
  const cookies = parseCookies(req);
  return cookies[SHOP_COOKIE_PREFIX + slug] === "authenticated";
}
