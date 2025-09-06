import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const { speaker } = req.body ?? {};
    if (!speaker) return res.status(400).json({ ok: false, error: 'Missing speaker profile' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Based on the speaker profile of ${speaker.name} who is an expert in ${speaker.topics.join(', ')}, generate three potential event titles, a short event description, and three sample Q&A questions.`;

    const out = await model.generateContent(prompt);
    const ideas = out.response.text();

    return res.status(200).json({ ok: true, ideas });
  } catch (err:any) {
    console.error('gemini.generate-event-ideas error', err);
    return res.status(500).json({ ok: false, error: 'Gemini function failed' });
  }
}
