import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const { eventDescription, speakerSummary } = req.body ?? {};
    if (!eventDescription || !speakerSummary) return res.status(400).json({ ok: false, error: 'Missing event description or speaker summary' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Based on the event description: "${eventDescription}", and the following speaker list:\n${speakerSummary}\nReturn only the comma-separated IDs of the top 3 matching speakers.`;

    const out = await model.generateContent(prompt);
    const text = out.response.text();
    const ids = text.split(',').map(id => id.trim());

    return res.status(200).json({ ok: true, ids });
  } catch (err:any) {
    console.error('gemini.find-matching-speakers error', err);
    return res.status(500).json({ ok: false, error: 'Gemini function failed' });
  }
}
