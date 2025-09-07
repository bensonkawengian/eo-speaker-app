import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { Speaker } from '../src/types';

const dbPath = path.resolve(process.cwd(), 'api/db.json');

function readDB(): Speaker[] {
  try {
    const fileContent = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading database file:', error);
    return [];
  }
}

function writeDB(data: Speaker[]): void {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const speakers = readDB();
    res.status(200).json(speakers);
  } else if (req.method === 'POST') {
    const newSpeakers = req.body;
    if (!Array.isArray(newSpeakers)) {
      return res.status(400).json({ message: 'Invalid data format. Expected an array of speakers.' });
    }
    writeDB(newSpeakers);
    res.status(200).json({ message: 'Database updated successfully.' });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
