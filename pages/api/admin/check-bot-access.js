import { getShops, getShopConfig, getShopSettings } from "@/lib/db";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { slug, accessCode, verifyCode } = req.query;

  const shops = getShops();
  if (!shops.find(s => s.slug === slug)) return res.json({ success:false, error:"shop_not_found" });

  const config = getShopConfig(slug);
  const bot    = config.telegramBot || {};

  if (!bot.enabled)                return res.json({ success:false, error:"access_disabled" });
  if (bot.accessCode !== accessCode) return res.json({ success:false, error:"wrong_access" });
  if (bot.verifyCode !== verifyCode) return res.json({ success:false, error:"wrong_code" });
  if (bot.telegramId !== null)       return res.json({ success:false, error:"already_bound" });

  const settings = getShopSettings(slug);
  const baseUrl  = process.env.SITE_URL || "https://b2bshopb2b.up.railway.app";

  return res.json({
    success:    true,
    shopSlug:   slug,
    shopName:   settings.name,
    siteApiUrl: `${baseUrl}/api/admin/update-stock`,
  });
}
