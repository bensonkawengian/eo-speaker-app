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
    const { nominationId } = req.body;

    if (!nominationId) {
      return res.status(400).json({ message: 'Missing nominationId' });
    }

    const dbPath = path.resolve(process.cwd(), 'api/database.json');
    const dbData = await fs.readFile(dbPath, 'utf-8');
    const data: Database = JSON.parse(dbData);

    const nominationIndex = data.nominations.findIndex(n => n.id === nominationId);
    if (nominationIndex === -1) {
      return res.status(404).json({ message: 'Nomination not found' });
    }

    const nomination = data.nominations[nominationIndex];

    const newSpeaker: Speaker = {
      id: `sp-${Math.random().toString(36).substr(2, 9)}`,
      type: nomination.type,
      fee: nomination.fee,
      name: nomination.name,
      chapter: nomination.chapter,
      city: "",
      country: "",
      topics: nomination.topics.split(',').map(t => t.trim()),
      formats: nomination.formats.split(',').map(f => f.trim()),
      languages: [],
      rating: { avg: 0, count: 0 },
      lastVerified: new Date().toISOString().slice(0, 10),
      bio: "",
      links: { linkedin: "", website: "", video: "" },
      contact: { email: nomination.email, phone: "" },
      reviews: [],
      insights: [],
      eventHistory: [],
      photoUrl: "",
      fee_min: Number(nomination.rateMin) || undefined,
      fee_max: Number(nomination.rateMax) || undefined,
      currency: nomination.rateCurrency,
      has_eo_special_rate: false,
      eo_rate_note: nomination.rateNotes,
    };

    data.speakers.push(newSpeaker);
    data.nominations.splice(nominationIndex, 1);

    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');

    res.status(200).json({ message: 'Nomination approved', newSpeaker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating database' });
  }
}
