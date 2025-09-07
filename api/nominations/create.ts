import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import type { Nomination, Speaker } from '../../src/types';

interface Database {
  speakers: Speaker[];
  nominations: Nomination[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const newNominationData = req.body;

    // Basic validation
    if (!newNominationData || !newNominationData.name || !newNominationData.email) {
      return res.status(400).json({ message: 'Missing required nomination fields' });
    }

    const dbPath = path.resolve(process.cwd(), 'api/database.json');
    const dbData = await fs.readFile(dbPath, 'utf-8');
    const data: Database = JSON.parse(dbData);

    const newNomination: Nomination = {
      ...newNominationData,
      id: `nom-${Math.random().toString(36).substr(2, 9)}`,
      nominated_at: new Date().toISOString(),
    };

    data.nominations.push(newNomination);

    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');

    res.status(201).json(newNomination);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error writing to database' });
  }
}
