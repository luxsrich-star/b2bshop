export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const correct = process.env.SUPER_ADMIN_PASSWORD || "superadmin";
  if (req.body.password === correct) return res.status(200).json({ ok: true });
  return res.status(401).json({ ok: false });
}
