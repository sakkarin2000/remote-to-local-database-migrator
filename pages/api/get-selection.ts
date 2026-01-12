import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const sel = (global as any).__storedSelection || null;
  if (!sel) return res.status(404).json({ error: "No selection stored" });
  res.status(200).json(sel);
}
