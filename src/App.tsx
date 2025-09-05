import React, { useMemo, useState, useEffect } from "react";
import { SEED_DATA } from './database';
import { SPEAKER_TYPE, FEE, Speaker, Nomination } from './types';

/**
 * EO APAC Speakers Directory
 * A professional, responsive, and feature-rich platform for managing and discovering top-tier speakers.
 */

// =========================
// Brand Tokens
// =========================
const EO = {
  navy: "#0B0B2B",
  blue: "#4F46E5",
  orange: "#FA653C",
  slate: "#0F172A",
  white: "#FFFFFF",
} as const;

// =========================
// Feature Flags
// =========================
export type Flags = {
  insightsTab: boolean;
  proRateBanner: boolean;
  adminGate: boolean;
  killSwitch: boolean;
};
export const flags: Flags = {
  insightsTab: true,
  proRateBanner: true,
  adminGate: true,
  killSwitch: false,
};

// =========================
// Telemetry (stub; drop-in PostHog/Amplitude later)
// =========================
const track = (name: string, props: Record<string, any> = {}) => {
  try {
    (window as any).__telemetry = (window as any).__telemetry || [];
    (window as any).__telemetry.push({ name, props, ts: Date.now() });
  } catch {}
};
const ev = {
  VIEW_PROFILE: "view_profile",
  SUBMIT_NOMINATION: "submit_nomination",
  SUBMIT_RATING: "submit_rating",
  GENERATE_INTRO: "generate_intro",
  SUGGEST_TOPICS: "suggest_topics",
  SUMMARIZE_REVIEWS: "summarize_reviews",
  ENHANCE_BIO: "enhance_bio",
};


// =========================
// Helpers
// =========================
const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function fmtMoney(currency: string, value: number) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value); }
  catch { return (currency === "USD" ? "US$" : currency + " ") + (value ?? 0).toLocaleString(); }
}

export function ratePreview(rate?: { currency: string; min: number; max?: number; unit?: string }) {
  if (!rate || !rate.min) return null;
  const base = rate.max && rate.max !== rate.min
    ? `${fmtMoney(rate.currency, rate.min)}–${fmtMoney(rate.currency, rate.max)}`
    : `${fmtMoney(rate.currency, rate.min)}`;
  return `${base}${rate.unit ? ` ${rate.unit}` : ""}`;
}

// =========================
// UI Components
// =========================
function Avatar({ name = "", size = 56, src = "" }: { name?: string; size?: number; src?: string }) {
  const [imageError, setImageError] = useState(false);
  useEffect(() => { setImageError(false); }, [src]);
  if (src && !imageError) {
    return <img src={src} alt={name} width={size} height={size} className="rounded-2xl object-cover flex-shrink-0" onError={() => setImageError(true)} />;
  }
  const initials = name.split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "EO";
  const bg = `linear-gradient(135deg, ${EO.blue}, ${EO.orange})`;
  return <div className="rounded-2xl grid place-items-center text-white font-semibold flex-shrink-0" style={{ width: size, height: size, background: bg }} aria-hidden>{initials}</div>;
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default"|"black"|"green"|"orange" }) {
  const map = { default: "bg-slate-100 text-slate-700", black: "bg-slate-900 text-white", green: "bg-emerald-100 text-emerald-700", orange: "bg-orange-100 text-orange-700" } as const;
  return <span className={cls("px-2 py-0.5 rounded-full text-xs font-medium", map[tone])}>{children}</span>;
}

function StarRow({ value = 0, size = 16 }: { value?: number; size?: number }) {
  const full = Math.floor(value); const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < full; const halfStar = !filled && i === full && half;
        return <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={filled || halfStar ? EO.blue : "none"} stroke={EO.blue} strokeWidth={1.5} className={halfStar ? "opacity-70" : ""} aria-hidden><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
      })}
    </div>
  );
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal>
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-end p-3 border-b border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1"><div className="p-6">{children}</div></div>
      </div>
    </div>
  );
}

// =========================
// Main App Component
// =========================
export default function App() {
  const [tab, setTab] = useState<"speakers"|"nominate"|"admin">("speakers");
  const [speakers, setSpeakers] = useState<Speaker[]>(()=>[...SEED_DATA]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All"|"Member"|"Pro">("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const current = useMemo(()=> speakers.find(s=>s.id===openId) || null, [openId, speakers]);
  const [admin, setAdmin] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [intro, setIntro] = useState<{ loading: boolean, text: string, error: string | null }>({ loading: false, text: "", error: null });
  const [topicSuggestion, setTopicSuggestion] = useState<{ loading: boolean, text: string, error: string | null }>({ loading: false, text: "", error: null });
  const [nominationBio, setNominationBio] = useState("");
  const [reviewSummary, setReviewSummary] = useState<{ loading: boolean, text: string, error: string | null }>({ loading: false, text: "", error: null });
  const [bioEnhancement, setBioEnhancement] = useState<{ loading: boolean, error: string | null }>({ loading: false, error: null });
  const [inline, setInline] = useState({ rating: 5, name: "", date: "", comment: "" });
  const today = new Date().toISOString().slice(0,10);
  const [nom, setNom] = useState<Omit<Nomination, 'id'>>({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", rateLastUpdated: today });
  const [pending, setPending] = useState<Nomination[]>([]);

  useEffect(()=>{ if (openId) track(ev.VIEW_PROFILE, { id: openId }); }, [openId]);

  if (flags.killSwitch) {
    return <div className="min-h-screen grid place-items-center" style={{ background: EO.white, color: EO.navy }}><div className="text-center"><h1 className="text-2xl font-bold">Temporarily unavailable</h1><p className="mt-2 text-slate-600">We’re deploying an update. Please refresh shortly.</p></div></div>;
  }

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return speakers.filter(s => {
      const matchesQ = !q || s.name.toLowerCase().includes(q) || s.topics.some(t=>t.toLowerCase().includes(q)) || (s.chapter||"").toLowerCase().includes(q);
      const matchesType = typeFilter === "All" || (typeFilter === "Member" && s.type === SPEAKER_TYPE.MEMBER) || (typeFilter === "Pro" && s.type === SPEAKER_TYPE.PRO);
      return matchesQ && matchesType;
    });
  }, [speakers, query, typeFilter]);

  async function callGeminiAPI(prompt: string, onComplete: (text: string) => void, onError: (error: string) => void) {
    try {
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { throw new Error(`API call failed with status: ${response.status}`); }
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onComplete(text);
        else throw new Error("Invalid response structure from API.");
    } catch (err: any) {
        console.error("Gemini API Error:", err);
        onError(err.message || "An unknown error occurred.");
    }
  }

  async function generateIntro() {
    if (!current) return;
    setIntro({ loading: true, text: "", error: null });
    track(ev.GENERATE_INTRO, { id: current.id });
    const prompt = `Generate a short, exciting MC introduction for a speaker. Name: ${current.name}, Bio: ${current.bio}, Topics: ${current.topics.join(", ")}. Keep it to 2-3 concise paragraphs.`;
    callGeminiAPI(prompt, (text) => setIntro({ loading: false, text, error: null }), (error) => setIntro({ loading: false, text: "", error }));
  }

  async function suggestTopics() {
    if (!nominationBio.trim()) return;
    setTopicSuggestion({ loading: true, text: "", error: null });
    track(ev.SUGGEST_TOPICS, { bio_length: nominationBio.length });
    const prompt = `Based on the following speaker bio/description, suggest 3-5 relevant, concise speaking topics. Return them as a single, comma-separated string (e.g., "Topic 1, Topic 2, Topic 3"). Description: "${nominationBio}"`;
    callGeminiAPI(prompt, (text) => { setTopicSuggestion({ loading: false, text, error: null }); setNom(prev => ({...prev, topics: text})); }, (error) => setTopicSuggestion({ loading: false, text: "", error }));
  }

  async function summarizeReviews() {
    if (!current || !current.reviews || current.reviews.length === 0) return;
    setReviewSummary({ loading: true, text: "", error: null });
    track(ev.SUMMARIZE_REVIEWS, { id: current.id, review_count: current.reviews.length });
    const reviewComments = current.reviews.map(r => `- "${r.comment}" (rated ${r.rating}/5)`).join("\n");
    const prompt = `Based on the following reviews for a speaker, provide a concise summary of their key strengths and any recurring feedback. Present the summary as a few bullet points.\n\nReviews:\n${reviewComments}\n\nSummary:`;
    callGeminiAPI(prompt, (text) => setReviewSummary({ loading: false, text, error: null }), (error) => setReviewSummary({ loading: false, text: "", error }));
  }

  async function enhanceBio() {
    if (!editing || !editing.bio.trim()) return;
    setBioEnhancement({ loading: true, error: null });
    track(ev.ENHANCE_BIO, { id: editing.id });
    const prompt = `Rewrite and enhance the following speaker bio to be more professional, engaging, and suitable for an event directory. Ensure it is well-written, concise, and highlights the speaker's expertise.\n\nOriginal Bio:\n"${editing.bio}"\n\nEnhanced Bio:`;
    callGeminiAPI(prompt, (text) => { setEditing(prev => prev ? { ...prev, bio: text } : null); setBioEnhancement({ loading: false, error: null }); }, (error) => setBioEnhancement({ loading: false, error }));
  }
  
  function submitInline(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    const name = (inline.name || "Anonymous").trim();
    if (!inline.date) { console.error("Please provide the event date."); return; }
    const last = (current.reviews || []).find(r=> (r.by||"").toLowerCase() === name.toLowerCase());
    if (last) {
      const days = (Date.now() - new Date(last.date).getTime()) / (1000*60*60*24);
      if (days < 180) { console.error("You can rate this speaker again after 6 months."); return; }
    }
    const idx = speakers.findIndex(s=>s.id===current.id);
    if (idx < 0) return;
    const s: any = { ...speakers[idx] };
    const total = (s.rating?.avg || 0) * (s.rating?.count || 0) + Number(inline.rating || 0);
    const count = (s.rating?.count || 0) + 1;
    s.rating = { avg: +(total / count).toFixed(1), count };
    const review = { by: name, date: inline.date, rating: inline.rating, comment: inline.comment || "" };
    s.reviews = [review, ...(s.reviews || [])];
    const next = [...speakers]; next[idx] = s; setSpeakers(next);
    setInline({ rating: 5, name: "", date: "", comment: "" });
    track(ev.SUBMIT_RATING, { id: s.id, rating: review.rating });
  }

  function handleNominationChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setNom(prev => ({ ...prev, [name]: value }));
  }

  function submitNomination(e: React.FormEvent) {
    e.preventDefault();
    const isPaid = nom.fee === FEE.PAID || nom.fee === FEE.PRO_PAID;
    if (isPaid && (nom.rateMin === "")) { console.error("Professional speakers must disclose an EO rate (min)."); return; }
    const id = `nom-${crypto.randomUUID()}`;
    setPending([{ id, ...nom }, ...pending]);
    setNom({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", rateLastUpdated: today });
    setTab("admin");
    track(ev.SUBMIT_NOMINATION, { id });
  }

  function approveNom(n: Nomination) {
    const isPaid = n.fee === FEE.PAID || n.fee === FEE.PRO_PAID;
    const hasRate = n.rateMin !== "" && !isNaN(Number(n.rateMin));
    if (isPaid && !hasRate) { console.error("EO rate is required for paid speakers."); return; }
    const topics = n.topics ? String(n.topics).split(",").map(t=>t.trim()).filter(Boolean) : ["General"];
    const formats = n.formats ? String(n.formats).split(",").map(f=>f.trim()).filter(Boolean) : ["Talk"];
    const rate = isPaid ? { currency: String(n.rateCurrency || "USD"), min: Number(n.rateMin), max: n.rateMax !== "" ? Number(n.rateMax) : undefined, unit: n.rateUnit || "per talk", notes: n.rateNotes || undefined, lastUpdated: n.rateLastUpdated || today } : undefined;

    const added: Speaker = {
      id: `sp-${crypto.randomUUID()}`, type: n.type, name: n.name || "Unnamed", chapter: n.chapter || (n.type === SPEAKER_TYPE.PRO ? "—" : "Unknown"), city: "", country: "", topics, formats, languages: ["English"], fee: n.fee, rate,
      rating: { avg: 0, count: 0 }, lastVerified: today, bio: "(Pending bio — submitted via nomination)", links: { linkedin: "#", website: "#", video: "#" }, contact: { email: n.email, phone: "" },
      reviews: [], insights: [], eventHistory: [], photoUrl: "",
    };
    setSpeakers([added, ...speakers]);
    setPending(pending.filter(x=>x.id!==n.id));
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    if (!editing) return;
    const { name, value } = e.target;
    if (name.startsWith("links.") || name.startsWith("contact.")) {
        const [obj, field] = name.split('.');
        setEditing(prev => prev ? { ...prev, [obj]: { ...prev[obj as keyof typeof prev], [field]: value } } : null);
        return;
    }
    setEditing(prev => prev ? {...prev, [name]: value} : null);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editing || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setEditing(prev => prev ? { ...prev, photoUrl: base64String } : null);
    };
    reader.readAsDataURL(file);
  }

  function handleRateChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    if (!editing) return;
    const { name, value } = e.target;
    setEditing(prev => {
        if (!prev) return null;
        const newRate = { ...(prev.rate || {}), [name]: name === 'min' || name === 'max' || name === 'discountMulti' ? Number(value) : value };
        return { ...prev, rate: newRate as any };
    });
  }
  
  function handleArrayChange<T>(field: keyof Speaker, index: number, subField: keyof T, value: any) {
    if (!editing) return;
    setEditing(prev => {
        if (!prev) return null;
        const newArray = [...(prev[field] as any[])];
        newArray[index] = { ...newArray[index], [subField]: value };
        return { ...prev, [field]: newArray };
    });
  }

  function addArrayItem(field: keyof Speaker, newItem: any) {
      if (!editing) return;
      setEditing(prev => {
          if (!prev) return null;
          const currentArray = (prev[field] as any[]) || [];
          return { ...prev, [field]: [...currentArray, newItem] };
      });
  }

  function removeArrayItem(field: keyof Speaker, index: number) {
      if (!editing) return;
      setEditing(prev => {
          if (!prev) return null;
          const currentArray = (prev[field] as any[]) || [];
          return { ...prev, [field]: currentArray.filter((_, i) => i !== index) };
      });
  }

  function saveEdit() {
    if (!editing) return;
    const index = speakers.findIndex(s => s.id === editing.id);
    if (index === -1) return;
    const newSpeakers = [...speakers];
    newSpeakers[index] = editing;
    setSpeakers(newSpeakers);
    setEditing(null);
  }

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");
    if (username === "eoapacadmin" && password === "apac234") {
        setAdmin(true);
        setLoginOpen(false);
        setLoginError("");
        setTab("admin");
    } else {
        setLoginError("Invalid username or password.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-['Inter',system-ui,_-apple-system]">
      <header className="text-white shadow-lg" style={{ background: EO.navy }}>
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-5 flex items-center justify-between">
          <button onClick={() => setTab("speakers")} className="flex items-center gap-3 md:gap-4 text-left focus:outline-none rounded-lg p-1 -ml-1">
            <img src="https://images.squarespace-cdn.com/content/v1/65cebf33011f0d40689c668d/97482ef8-8939-4116-a165-da02c623adf5/EO+APAC+logo+2025+-+white.png?format=1500w" alt="EO APAC Logo" className="h-10 md:h-12 w-auto" />
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">Speakers Directory</h1>
          </button>
          <nav className="hidden md:flex gap-2">
            <button onClick={()=>setTab("speakers")} className={cls("px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200", tab==='speakers'?"bg-white text-indigo-700 shadow-md":"bg-white/10 hover:bg-white/20")}>Speakers</button>
            <button onClick={()=>setTab("nominate")} className={cls("px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200", tab==='nominate'?"bg-white text-indigo-700 shadow-md":"bg-white/10 hover:bg-white/20")}>Nominate</button>
            {admin && <button onClick={()=>setTab("admin")} className={cls("px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200", tab==='admin'?"bg-white text-indigo-700 shadow-md":"bg-white/10 hover:bg-white/20")}>Admin</button>}
          </nav>
        </div>
        <nav className="md:hidden flex justify-around p-2 bg-slate-800">
            <button onClick={()=>setTab("speakers")} className={cls("px-3 py-2 text-xs font-semibold rounded-md flex-1", tab==='speakers'?"bg-white text-indigo-700":"text-white")}>Speakers</button>
            <button onClick={()=>setTab("nominate")} className={cls("px-3 py-2 text-xs font-semibold rounded-md flex-1", tab==='nominate'?"bg-white text-indigo-700":"text-white")}>Nominate</button>
            {admin && <button onClick={()=>setTab("admin")} className={cls("px-3 py-2 text-xs font-semibold rounded-md flex-1", tab==='admin'?"bg-white text-indigo-700":"text-white")}>Admin</button>}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'speakers' && (
          <section>
            {/* ... Full JSX for Speakers Tab ... */}
          </section>
        )}
        {tab === 'nominate' && (
           <section>
            {/* ... Full JSX for Nominate Tab ... */}
          </section>
        )}
        {tab === 'admin' && (
           <section>
            {/* ... Full JSX for Admin Tab ... */}
          </section>
        )}
      </main>

      <footer className="mt-16 border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-slate-500">
            © 2024 Entrepreneurs’ Organization - APAC Region | 
            <a href="#" className="hover:underline mx-2">Terms of Use</a> | 
            <a href="#" className="hover:underline mx-2">Privacy Policy</a>
            {!admin && flags.adminGate && (
              <> | <button onClick={() => setLoginOpen(true)} className="hover:underline mx-2">Admin Login</button></>
            )}
        </div>
      </footer>

      {/* All Modals */}
      <Modal open={isLoginOpen} onClose={() => setLoginOpen(false)}>
        {/* ... Login Modal JSX ... */}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {/* ... Editing Modal JSX ... */}
      </Modal>
      <Modal open={!!openId} onClose={()=>{ setOpenId(null); setShowContact(false); }}>
        {/* ... Profile Modal JSX ... */}
      </Modal>
    </div>
  );
}

