import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import type { Nomination, Speaker, SpeakerReview } from '../../src/types';

interface Database {
  speakers: Speaker[];
  nominations: Nomination[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const { speakerId, review } = req.body;

    if (!speakerId || !review) {
      return res.status(400).json({ message: 'Missing speakerId or review data' });
    }

    const dbPath = path.resolve(process.cwd(), 'api/database.json');
    const dbData = await fs.readFile(dbPath, 'utf-8');
    const data: Database = JSON.parse(dbData);

    const speakerIndex = data.speakers.findIndex(s => s.id === speakerId);
    if (speakerIndex === -1) {
      return res.status(404).json({ message: 'Speaker not found' });
    }

    const speaker = data.speakers[speakerIndex];

    const newReview: SpeakerReview = {
      ...review,
      date: new Date().toISOString(),
    };

    speaker.reviews.unshift(newReview); // Add to the beginning of the array

    // Recalculate average rating
    const totalRating = speaker.reviews.reduce((sum, r) => sum + r.rating, 0);
    speaker.rating.count = speaker.reviews.length;
    speaker.rating.avg = totalRating / speaker.rating.count;

    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');

    res.status(200).json({ message: 'Review added', speaker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating database' });
  }
}
