import { NextApiRequest, NextApiResponse } from 'next';

type Creds = { host: string; user: string; password: string; database: string };

declare global {
  // eslint-disable-next-line no-var
  var __storedCreds: { source?: Creds; destination?: Creds } | undefined;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { source, destination } = req.body;
  if (!global.__storedCreds) global.__storedCreds = {};
  global.__storedCreds.source = source;
  global.__storedCreds.destination = destination;
  res.status(200).json({ ok: true });
}
