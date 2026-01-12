import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const creds = (global as any).__storedCreds || null;
  if (!creds) return res.status(404).json({ error: 'No credentials stored' });
  res.status(200).json(creds);
}
