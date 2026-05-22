import { getShops, getShopConfig, saveShopConfig } from "@/lib/db";

function genCode(len, digits=false) {
  const chars = digits ? "0123456789" : "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:len}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}

export default function handler(req, res) {
  if (req.method === "GET") {
    const { slug } = req.query;
    const shops = getShops();
    if (!shops.find(s => s.slug === slug)) return res.status(404).end();
    return res.json(getShopConfig(slug));
  }

  if (req.method === "POST") {
    const { slug, action } = req.query;
    const shops = getShops();
    if (!shops.find(s => s.slug === slug)) return res.status(404).end();
    const config = getShopConfig(slug);

    if (action === "enable") {
      config.telegramBot = {
        enabled:    true,
        accessCode: genCode(8),
        verifyCode: genCode(4, true),
        telegramId: null,
      };
      saveShopConfig(slug, config);
      return res.json(config);
    }

    if (action === "disable") {
      config.telegramBot = { enabled:false, accessCode:"", verifyCode:"", telegramId:null };
      saveShopConfig(slug, config);
      return res.json(config);
    }

    if (action === "regenerate") {
      config.telegramBot.accessCode = genCode(8);
      config.telegramBot.verifyCode = genCode(4, true);
      saveShopConfig(slug, config);
      return res.json(config);
    }

    if (action === "reset") {
      config.telegramBot.telegramId  = null;
      config.telegramBot.accessCode  = genCode(8);
      config.telegramBot.verifyCode  = genCode(4, true);
      saveShopConfig(slug, config);
      return res.json(config);
    }

    return res.status(400).json({ error: "unknown action" });
  }

  res.status(405).end();
}
