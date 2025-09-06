import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const { bio, tags } = req.body ?? {};
    if (!bio) return res.status(400).json({ ok: false, error: 'Missing bio' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Suggest 8 concise talk/workshop topics for EO audiences based on this speaker bio: ${bio}.
Return as a JSON array of strings. Consider tags: ${tags ?? 'none'}.`;

    const out = await model.generateContent(prompt);
    const text = out.response.text();

    // Basic JSON safety
    let ideas;
    try { ideas = JSON.parse(text); } catch { ideas = text.split('\n').filter(Boolean).slice(0, 8); }

    return res.status(200).json({ ok: true, ideas });
  } catch (err:any) {
    console.error('gemini.suggest-topics error', err);
    return res.status(500).json({ ok: false, error: 'Gemini function failed' });
  }
}
