/** @type {import('next').NextConfig} */

/**
 * Security headers applied to all responses.
 * Security: implements OWASP recommended HTTP security headers.
 *
 * HSTS         — forces HTTPS for 1 year, including subdomains
 * CSP          — restricts resource origins to prevent XSS
 * X-Frame      — prevents clickjacking
 * X-Content    — prevents MIME sniffing
 * Referrer     — limits referrer information leakage
 * Permissions  — disables unused browser features
 */
const securityHeaders = [
  {
    // HTTP Strict Transport Security — enforce HTTPS for 1 year
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Content Security Policy — restrict resource origins
    // Allows: self, Google Fonts, Cloudinary images, Telegram links
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",          // Next.js requires unsafe-inline for hydration
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "connect-src 'self' https://api.cloudinary.com",
      "frame-ancestors 'none'",                      // equivalent to X-Frame-Options: DENY
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    // Prevent clickjacking attacks
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Limit referrer information sent to third parties
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Disable unused browser features
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    // Prevent XSS attacks in older browsers
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ["res.cloudinary.com"],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
