import { rateLimit, setSecurityHeaders, getIP } from "@/lib/security";

export default function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).end();

  const ip = getIP(req);
  const limit = rateLimit(ip + ":superlogin", 5, 60_000); // 5 attempts per minute
  if (!limit.ok) {
    return res.status(429).json({ ok: false, error: `Слишком много попыток. Подождите ${limit.retryAfter} сек.` });
  }

  const correct = process.env.SUPER_ADMIN_PASSWORD || "superadmin";
  const { password } = req.body;

  if (!password || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Пароль не указан" });
  }

  // Timing-safe comparison
  const buf1 = Buffer.alloc(256, password);
  const buf2 = Buffer.alloc(256, correct);
  const match = require("crypto").timingSafeEqual(buf1, buf2) && password === correct;

  if (match) return res.status(200).json({ ok: true });
  return res.status(401).json({ ok: false, error: "Неверный пароль" });
}
