import { NextApiRequest, NextApiResponse } from 'next';

declare global {
  // eslint-disable-next-line no-var
  var __storedSelection: { selectedTables?: string[] } | undefined;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { selectedTables } = req.body;
  if (!global.__storedSelection) global.__storedSelection = {};
  global.__storedSelection.selectedTables = selectedTables;
  res.status(200).json({ ok: true });
}
