import { getShops, getShopConfig, saveShopConfig } from "@/lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { shopSlug, telegramId, spreadsheetId } = req.body;
  if (!shopSlug || !telegramId) return res.status(400).json({ success:false, error:"missing fields" });

  const shops = getShops();
  if (!shops.find(s => s.slug === shopSlug)) return res.json({ success:false, error:"shop_not_found" });

  const config = getShopConfig(shopSlug);
  config.telegramBot.telegramId    = telegramId;
  config.telegramBot.verifyCode    = "";
  if (spreadsheetId) config.telegramBot.spreadsheetId = spreadsheetId;  // ← ДОБАВЛЕНО
  saveShopConfig(shopSlug, config);

  return res.json({ success: true });
}
