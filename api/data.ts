import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Only GET requests are allowed' });
  }

  try {
    const dbPath = path.resolve(process.cwd(), 'api/database.json');
    const dbData = await fs.readFile(dbPath, 'utf-8');
    const data = JSON.parse(dbData);

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error reading database' });
  }
}
