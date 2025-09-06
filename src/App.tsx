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
  aiFeatures: boolean;
};
export const flags: Flags = {
  insightsTab: true,
  proRateBanner: true,
  adminGate: true,
  killSwitch: false,
  aiFeatures: false,
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

const CHAPTER_OPTIONS = [
  "EO - Non APAC & Others",
  "EO Malaysia",
  "EO Philippines",
  "EO Philippines South",
  "EO Singapore",
  "EO Vietnam",
  "EO APAC Bridge",
  "EO Bangkok Metropolitan",
  "EO Indonesia",
  "EO Indonesia East",
  "EO Thailand",
  "EO APAC Platinum One Bridge",
  "EO Adelaide",
  "EO Melbourne",
  "EO New Zealand",
  "EO Perth",
  "EO Queensland",
  "EO Sydney",
];

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
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [nominationBio, setNominationBio] = useState("");
  const [topicSuggestion, setTopicSuggestion] = useState({ loading: false, error: "" });
  const [nom, setNom] = useState<Omit<Nomination, 'id'>>({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", nominated_at: new Date().toISOString().slice(0,10), referrerName: "", referrerChapter: "" });
  const [pending, setPending] = useState<Nomination[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventDescription, setEventDescription] = useState("");
  const [matchingSpeakers, setMatchingSpeakers] = useState<Speaker[]>([]);
  const [eventIdeas, setEventIdeas] = useState<string>("");
  const [profileVersion, setProfileVersion] = useState(0);
  
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return speakers.filter(s => {
      const matchesQ = !q || s.name.toLowerCase().includes(q) || s.topics.some(t=>t.toLowerCase().includes(q)) || (s.chapter||"").toLowerCase().includes(q);
      const matchesType = typeFilter === "All" || (typeFilter === "Member" && s.type === SPEAKER_TYPE.MEMBER) || (typeFilter === "Pro" && s.type === SPEAKER_TYPE.PRO);
      return matchesQ && matchesType;
    });
  }, [speakers, query, typeFilter]);
  
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

  function handleNominationChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setNom(prev => ({ ...prev, [name]: value }));
  }

  async function generateEventIdeas(speaker: Speaker) {
    const response = await fetch('/api/gemini/generate-event-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error);
    setEventIdeas(data.ideas);
  }

  function draftBookingEmail(speaker: Speaker) {
    const subject = `EO APAC Speaker Inquiry: ${speaker.name}`;
    const body = `Dear ${speaker.name},

We are interested in the possibility of having you speak at an upcoming EO event.

[Your event details here]

Could you please let us know your availability and requirements?

Best regards,
[Your Name]
[Your Chapter]`;
    window.location.href = `mailto:${speaker.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function findMatchingSpeakers() {
    if (!eventDescription) return;
    const speakerSummary = speakers.map(s => `id: ${s.id}, name: ${s.name}, topics: ${s.topics.join(', ')}`).join('\\n');
    const response = await fetch('/api/gemini/find-matching-speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventDescription, speakerSummary }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error);
    const ids = data.ids;
    setMatchingSpeakers(speakers.filter(s => ids.includes(s.id)));
  }

  async function suggestTopics() {
    if (!nominationBio) return;
    setTopicSuggestion({ loading: true, error: "" });
    try {
      const response = await fetch('/api/gemini/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: nominationBio }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
      setNom(prev => ({ ...prev, topics: data.ideas.join(', ') }));
    } catch (error) {
      setTopicSuggestion({ loading: false, error: "Failed to suggest topics." });
    } finally {
      setTopicSuggestion({ loading: false, error: "" });
    }
  }
  async function submitNomination(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newNomination = { ...nom, id: `nom-${Math.random().toString(36).substr(2, 9)}` };
      setPending([...pending, newNomination]);
      alert("Nomination submitted successfully!");
      // Reset form
      setNom({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", nominated_at: new Date().toISOString().slice(0,10), referrerName: "", referrerChapter: "" });
      setNominationBio("");
    } catch (error) {
      alert("Failed to submit nomination.");
    } finally {
      setIsSubmitting(false);
    }
  }
  function approveNom(n: Nomination) {
    // TODO: A future improvement would be to open the speaker editor modal
    // for the admin to fill in the missing details before creating the speaker.
    const newSpeaker: Speaker = {
      id: `sp-${Math.random().toString(36).substr(2, 9)}`,
      type: n.type,
      fee: n.fee,
      name: n.name,
      chapter: n.chapter,
      city: "",
      country: "",
      topics: n.topics.split(',').map(t => t.trim()),
      formats: n.formats.split(',').map(f => f.trim()),
      languages: [],
      rating: { avg: 0, count: 0 },
      lastVerified: new Date().toISOString().slice(0, 10),
      bio: "",
      links: { linkedin: "", website: "", video: "" },
      contact: { email: n.email, phone: "" },
      reviews: [],
      insights: [],
      eventHistory: [],
      photoUrl: "",
      fee_min: Number(n.rateMin) || undefined,
      fee_max: Number(n.rateMax) || undefined,
      currency: n.rateCurrency,
      has_eo_special_rate: false,
      eo_rate_note: n.rateNotes,
    };
    setSpeakers(prev => [...prev, newSpeaker]);
    setPending(prev => prev.filter(p => p.id !== n.id));
    alert(`${n.name} has been approved and added to the directory.`);
  }
  function handleUpdateSpeaker() {
    if (!editing) return;
    setSpeakers(speakers.map(s => s.id === editing.id ? editing : s));
    setEditing(null);
    setProfileVersion(v => v + 1);
  }

  function handleDeleteSpeaker(speakerId: string) {
    if (window.confirm("Are you sure you want to delete this speaker?")) {
      setSpeakers(speakers.filter(s => s.id !== speakerId));
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0] && editing) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditing({ ...editing, photoUrl: event.target.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function handleArrayChange<T>(index: number, field: keyof T, value: any, arrayName: keyof Speaker) {
    if (!editing) return;
    const newArray = [...(editing[arrayName] as T[])];
    newArray[index] = { ...newArray[index], [field]: value };
    setEditing({ ...editing, [arrayName]: newArray });
  }

  function addArrayItem<T>(arrayName: keyof Speaker, newItem: T) {
    if (!editing) return;
    const newArray = [...(editing[arrayName] as T[]), newItem];
    setEditing({ ...editing, [arrayName]: newArray });
  }

  function removeArrayItem<T>(index: number, arrayName: keyof Speaker) {
    if (!editing) return;
    const newArray = (editing[arrayName] as T[]).filter((_, i) => i !== index);
    setEditing({ ...editing, [arrayName]: newArray });
  }

  function submitReview(e: React.FormEvent<HTMLFormElement>, speakerId: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const by = formData.get('by') as string;
    const rater_chapter_id = formData.get('rater_chapter_id') as string;
    const rating = Number(formData.get('rating'));
    const comment = formData.get('comment') as string;
    const event_name = formData.get('event_name') as string || undefined;
    const event_date = formData.get('event_date') as string || undefined;
    const format = formData.get('format') as 'talk' | 'workshop' | 'panel' || undefined;

    if (!by || !rater_chapter_id || !rating || !comment) return;

    const newReview = { by, date: new Date().toISOString(), rating, comment, rater_chapter_id, event_name, event_date, format };

    setSpeakers(speakers.map(sp => {
      if (sp.id === speakerId) {
        const newReviews = [newReview, ...sp.reviews];
        const newRatingCount = newReviews.length;
        const newRatingAvg = newReviews.reduce((sum, r) => sum + r.rating, 0) / newRatingCount;
        return { ...sp, reviews: newReviews, rating: { avg: newRatingAvg, count: newRatingCount } };
      }
      return sp;
    }));
    form.reset();
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const csv = event.target.result as string;
          const lines = csv.split('\n').slice(1);
          const newSpeakers = lines.map(line => {
            const values = line.split(',');
            const newSpeaker: Speaker = {
              id: `sp-${Math.random().toString(36).substr(2, 9)}`,
              name: values[0],
              type: values[1] as any,
              chapter: values[2],
              city: values[3],
              country: values[4],
              topics: values[5].split(';').map(t => t.trim()),
              formats: values[6].split(';').map(t => t.trim()),
              languages: values[7].split(';').map(t => t.trim()),
              fee: values[8] as any,
              bio: values[9],
              photoUrl: values[10],
              contact: { email: values[11], phone: values[12] },
              links: { linkedin: values[13], website: values[14], video: values[15] },
              rating: { avg: 0, count: 0 },
              reviews: [],
              insights: [],
              eventHistory: [],
              lastVerified: new Date().toISOString().slice(0,10),
            };
            return newSpeaker;
          });
          setSpeakers([...speakers, ...newSpeakers]);
        }
      };
      reader.readAsText(e.target.files[0]);
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
            <div className="mb-8 rounded-xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg" style={{ background: `linear-gradient(110deg, ${EO.blue}, ${EO.navy})` }}>
               <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full opacity-80" aria-hidden="true"></div>
               <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Find Your Next Unforgettable Speaker</h2>
                <p className="mt-3 max-w-3xl text-white/80 leading-relaxed">
                    Welcome to the EO APAC Speaker Directory, your curated gateway to the region's most inspiring minds. Explore a diverse roster of peer-vetted EO members and industry-leading professionals, ready to elevate your next event. Dive into detailed profiles and transparent ratings to find the perfect voice to captivate your audience.
                </p>
               </div>
            </div>

            {flags.aiFeatures && (
              <div className="my-8">
                <h3 className="text-lg font-semibold">✨ AI Speaker Matchmaker</h3>
                <p className="mt-1 text-sm text-slate-600">Describe your event and we'll suggest the top 3 speakers.</p>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm"
                  rows={3}
                  placeholder="e.g., We are looking for a speaker for our annual leadership retreat. The audience is comprised of 50 CEOs from the tech industry. The desired topic is 'The Future of AI in Business'."
                />
                <button
                  type="button"
                  onClick={findMatchingSpeakers}
                  className="mt-2 px-4 py-2 rounded-lg text-white text-sm bg-indigo-600 hover:bg-indigo-700"
                >
                  Find Matching Speakers
                </button>
                {matchingSpeakers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold">Recommended Speakers:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                      {matchingSpeakers.map(sp => (
                        <article key={sp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                          <div className="relative h-40" style={{ backgroundImage: `url(${sp.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>
                              <div className="absolute bottom-0 left-0 p-4">
                                  <h3 className="text-lg font-bold text-white tracking-tight">{sp.name}</h3>
                                  <p className="text-xs text-white/80">{sp.chapter !== "—" ? sp.chapter : `${sp.city}, ${sp.country}`}</p>
                              </div>
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                              <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2 flex-grow-0">{sp.bio}</p>
                              <div className="mt-auto pt-5 flex items-center justify-between">
                                  <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors" onClick={() => setOpenId(sp.id)}>View Profile</button>
                              </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-slate-600">Search</label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
                  <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, topic, or chapter..." className="w-full outline-none text-slate-800 placeholder-slate-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Type</span>
                <div className="flex gap-1 bg-white rounded-lg border p-1">
                  <button onClick={()=>setTypeFilter("All")} className={cls("px-2 py-1 rounded text-xs", typeFilter==='All'?"bg-indigo-600 text-white":"hover:bg-slate-100")}>All</button>
                  <button onClick={()=>setTypeFilter("Member")} className={cls("px-2 py-1 rounded text-xs", typeFilter==='Member'?"bg-indigo-600 text-white":"hover:bg-slate-100")}>Member</button>
                  <button onClick={()=>setTypeFilter("Pro")} className={cls("px-2 py-1 rounded text-xs", typeFilter==='Pro'?"bg-indigo-600 text-white":"hover:bg-slate-100")}>Professional</button>
                </div>
              </div>
              <div className="text-sm text-slate-600 md:ml-auto text-center md:text-right w-full md:w-auto">{filtered.length} speakers</div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(sp => (
                <article key={sp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                  <div className="relative h-40" style={{ backgroundImage: `url(${sp.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>
                      <div className="absolute bottom-0 left-0 p-4">
                          <h3 className="text-lg font-bold text-white tracking-tight">{sp.name}</h3>
                          <p className="text-xs text-white/80">{sp.chapter !== "—" ? sp.chapter : `${sp.city}, ${sp.country}`}</p>
                      </div>
                      <div className="absolute top-3 right-3">
                           <Badge tone={sp.fee === FEE.PAID ? "orange" : sp.type === SPEAKER_TYPE.PRO ? "orange" : "green"}>{sp.fee}</Badge>
                      </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-2">
                              <StarRow value={sp.rating.avg} />
                              <span className="text-xs text-slate-600">{sp.rating.avg} ({sp.rating.count})</span>
                           </div>
                           <Badge tone="black">{sp.type}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2 flex-grow-0">{sp.bio}</p>
                      <div className="mt-4 pt-4 border-t border-slate-200/80">
                          <h4 className="text-xs font-semibold text-slate-500 mb-2 tracking-wider">TOPICS</h4>
                          <div className="flex flex-wrap gap-2">
                              {sp.topics.slice(0, 3).map(t => <Badge key={t}>{t}</Badge>)}
                              {sp.topics.length > 3 && <Badge>+{sp.topics.length - 3} more</Badge>}
                          </div>
                      </div>
                      <div className="mt-auto pt-5 flex items-center justify-between">
                          <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors" onClick={() => setOpenId(sp.id)}>View Profile</button>
                          <a href={sp.links?.linkedin || '#'} className="text-sm text-indigo-700 hover:underline font-medium">LinkedIn</a>
                      </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

{tab === 'nominate' && (
          <section className="grid lg:grid-cols-3 gap-6">
            <form className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6" onSubmit={submitNomination}>
              <h2 className="text-lg font-semibold">Nominate a Speaker</h2>
              <p className="mt-1 text-sm text-slate-600">Anyone can nominate. Professional speakers must disclose EO rates.</p>

              {flags.aiFeatures && (
                <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-800">✨ AI Topic Suggester</h3>
                  <p className="mt-1 text-sm text-slate-600">Paste the speaker's bio or LinkedIn summary below to get AI-suggested topics.</p>
                  <textarea
                    value={nominationBio}
                    onChange={(e) => setNominationBio(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm"
                    rows={4}
                    placeholder="e.g., Jane Doe is an award-winning entrepreneur who..."
                  />
                  <button
                    type="button"
                    onClick={suggestTopics}
                    disabled={topicSuggestion.loading}
                    className="mt-2 px-4 py-2 rounded-lg text-white text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {topicSuggestion.loading ? "Suggesting..." : "✨ Suggest Topics"}
                  </button>
                  {topicSuggestion.error && <p className="mt-2 text-sm text-red-600">{topicSuggestion.error}</p>}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-slate-600">Speaker's Name</label><input name="name" required value={nom.name} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Speaker's Chapter/Company (optional)</label><input name="chapter" value={nom.chapter} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Your Name (Referrer)</label><input name="referrerName" required value={nom.referrerName} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Your EO Chapter / Organization (Referrer)</label><input name="referrerChapter" required value={nom.referrerChapter} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Type</label><select name="type" value={nom.type} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm">{Object.values(SPEAKER_TYPE).map(t=> <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-slate-600">Fee</label><select name="fee" value={nom.fee} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm">{Object.values(FEE).map(f=> <option key={f} value={f}>{f}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-slate-600">Email</label><input name="email" required type="email" value={nom.email} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-600">Topics (comma-separated)</label><input name="topics" value={nom.topics} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-600">Formats (e.g., Talk, Workshop)</label><input name="formats" value={nom.formats} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>

                {(nom.fee === FEE.PAID || nom.fee === FEE.PRO_PAID) && (
                  <div className="md:col-span-2 rounded-xl border border-amber-300/80 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-900">EO Chapter Rate</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div><label className="text-xs font-semibold text-slate-600">Currency</label><select name="rateCurrency" value={nom.rateCurrency} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm">{["USD","AUD","SGD","NZD","PHP","IDR","INR","HKD", "JPY"].map(c=> <option key={c} value={c}>{c}</option>)}</select></div>
                      <div><label className="text-xs font-semibold text-slate-600">Min</label><input name="rateMin" required value={nom.rateMin} onChange={e=>setNom({...nom, rateMin: e.target.value.replace(/[^0-9.]/g,'')})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" placeholder="e.g., 3000" /></div>
                      <div><label className="text-xs font-semibold text-slate-600">Max (opt)</label><input name="rateMax" value={nom.rateMax} onChange={e=>setNom({...nom, rateMax: e.target.value.replace(/[^0-9.]/g,'')})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" placeholder="e.g., 6000" /></div>
                      <div><label className="text-xs font-semibold text-slate-600">Unit</label><input name="rateUnit" value={nom.rateUnit} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" placeholder="per talk" /></div>
                      <div className="md:col-span-6"><label className="text-xs font-semibold text-slate-600">Notes (opt)</label><input name="rateNotes" value={nom.rateNotes} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" placeholder="e.g., plus travel" /></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3"><button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50" style={{ background: `linear-gradient(90deg, ${EO.blue}, ${EO.orange})` }}>{isSubmitting ? "Submitting..." : "Submit"}</button></div>
            </form>
            <aside className="rounded-2xl p-6" style={{ background: `${EO.blue}0D`, border: `1px solid ${EO.blue}33` }}>
              <h3 className="font-semibold" style={{ color: EO.navy }}>Prefer email?</h3>
              <p className="mt-2 text-sm text-slate-700">Forward speaker pitches to <code className="bg-white px-1 py-0.5 rounded">speakers@eoapac.org</code> — we’ll park them in Admin.</p>
            </aside>
          </section>
        )}

      
      {tab === 'admin' && (
          <section className="space-y-6">
            {!admin ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
                <h2 className="text-lg font-semibold">Admin Dashboard</h2>
                <p className="mt-1 text-sm text-slate-600">Please sign in to manage speakers and nominations.</p>
                <div className="mt-4">
                  <button onClick={()=>setLoginOpen(true)} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: `linear-gradient(90deg, ${EO.blue}, ${EO.orange})` }}>Admin Sign In</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                  <div className="text-sm">Signed in as <strong>Regional Admin</strong></div>
                  <button className="px-3 py-1.5 rounded-lg border text-xs" onClick={()=>setAdmin(false)}>Sign out</button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
                  <h3 className="text-lg font-semibold">Pending Nominations</h3>
                  <div className="mt-4 flex items-center gap-4">
                    <select className="text-sm border-slate-200 rounded-lg">
                      <option>Sort by Newest</option>
                      <option>Sort by Oldest</option>
                    </select>
                    <select className="text-sm border-slate-200 rounded-lg">
                      <option>All Dates</option>
                      <option>Last 30 days</option>
                    </select>
                  </div>
                  {pending.length === 0 && <div className="mt-2 text-sm text-slate-500">No new nominations to review.</div>}
                  <div className="mt-4 space-y-4">
                    {pending.map(n=> (<div key={n.id} className="p-4 rounded-xl border bg-slate-50/70 shadow-sm"><div className="flex items-start justify-between"><div className="flex items-start gap-3"><Avatar name={n.name} size={40} /><div><div className="font-semibold text-slate-900">{n.name}</div><div className="text-sm text-slate-600">{n.type}</div><a href={`mailto:${n.email}`} className="text-sm text-indigo-600 hover:underline">{n.email}</a></div></div><div className="text-right flex-shrink-0 ml-4"><div className="text-xs text-slate-500">Nominated on {new Date(n.nominated_at).toLocaleDateString()}</div></div></div><div className="mt-3 border-t border-slate-200 pt-3 space-y-1.5">{n.chapter && <div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Chapter/Co:</strong> {n.chapter}</div>}{n.topics && <div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Topics:</strong> {n.topics}</div>}{(n.rateMin) && (<div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Rate:</strong> {ratePreview({ currency: n.rateCurrency, min: Number(n.rateMin), max: n.rateMax?Number(n.rateMax):undefined, unit: n.rateUnit })}</div>)}{n.rateNotes && (<div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Rate Notes:</strong> {n.rateNotes}</div>)}<div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Referred by:</strong> {n.referrerName} ({n.referrerChapter})</div></div><div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2"><button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors" onClick={()=>approveNom(n)}>Approve</button><button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors" onClick={()=>setPending(pending.filter(x=>x.id!==n.id))}>Reject</button></div></div>))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold">Bulk Upload Speakers</h3>
                    <div className="mt-4">
                        <a href="/speaker_upload_template.csv" download className="text-sm text-indigo-600 hover:underline">Download CSV Template</a>
                        <div className="mt-2">
                            <input type="file" accept=".csv" onChange={handleCsvUpload} className="text-sm" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold">Manage Speakers</h3>
                    <div className="mt-4 space-y-3">
                        {speakers.map(sp => (<div key={sp.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50"><div className="flex items-center gap-3"><Avatar name={sp.name} src={sp.photoUrl} size={40}/><div><div className="font-semibold text-slate-900">{sp.name}</div><div className="text-xs text-slate-600">{sp.chapter}</div></div></div><div className="flex gap-2"><button onClick={() => setEditing(JSON.parse(JSON.stringify(sp)))} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">Edit</button><button onClick={() => handleDeleteSpeaker(sp.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">Delete</button></div></div>))}
                    </div>
                </div>
              </>
            )}
          </section>
        )}
        
      </main>

      <footer className="mt-16 border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-slate-500">
            © 2025 Entrepreneurs’ Organization - APAC by Project Five Durians.
            {!admin && flags.adminGate && (
              <> | <button onClick={() => setLoginOpen(true)} className="hover:underline mx-2">Admin Login</button></>
            )}
        </div>
      </footer>
      
{/* All Modals */}
      <Modal open={!!openId} onClose={()=>{ setOpenId(null); setEventIdeas(""); }}>
        {current ? (
          <div key={profileVersion}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar name={current.name} size={64} src={current.photoUrl} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-slate-900">{current.name}</h3>
                    <Badge tone="black">{current.type}</Badge>
                    <Badge tone={current.fee === FEE.PAID ? "orange" : current.type === SPEAKER_TYPE.PRO ? "orange" : "green"}>{current.fee}</Badge>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">{current.chapter !== "—" ? current.chapter + " \u00b7 " : ""}{current.city || "—"}, {current.country || "—"}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRow value={current.rating?.avg || 0} />
                    <span className="text-xs text-slate-600">{current.rating?.avg ?? 0} ({current.rating?.count ?? 0})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a href={current.links?.linkedin || '#'} className="text-sm text-indigo-700 hover:underline">LinkedIn</a>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
              <div><strong>Email:</strong> <a href={`mailto:${current.contact.email}`} className="text-indigo-600">{current.contact.email}</a></div>
              <div><strong>Phone:</strong> {current.contact.phone}</div>
              <button onClick={() => draftBookingEmail(current)} className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">Draft Booking Email</button>
            </div>
            
            <div className="mt-5 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-5">
                <section><h4 className="font-semibold">About</h4><p className="mt-1 text-sm text-slate-700 leading-relaxed">{current.bio || '—'}</p></section>
                <section><h4 className="font-semibold">Topics & Formats</h4><div className="mt-2 flex flex-wrap gap-2">{(current.topics||[]).map((t:string)=> <Badge key={t}>{t}</Badge>)}</div><div className="mt-2 text-sm text-slate-600">Formats: {(current.formats||[]).join(' \u00b7 ')}</div><div className="mt-1 text-sm text-slate-600">Languages: {(current.languages||[]).join(', ')}</div></section>
                {(current.fee_min || current.fee_max) && (
                  <section>
                    <h4 className="font-semibold">Rates</h4>
                    <p className="text-sm">{ratePreview({ currency: current.currency || 'USD', min: current.fee_min || 0, max: current.fee_max || undefined })}</p>
                    {current.has_eo_special_rate && <Badge tone="green">EO Special Rate</Badge>}
                    {current.eo_rate_note && <p className="text-xs text-slate-500 mt-1">{current.eo_rate_note}</p>}
                  </section>
                )}
                {flags.insightsTab && current.insights && current.insights.length > 0 && (
                  <section>
                    <h4 className="font-semibold">Insights</h4>
                    <div className="mt-2 space-y-3">
                      {current.insights.map((insight, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                          <a href={insight.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-indigo-700 hover:underline">{insight.title}</a>
                          <p className="text-sm mt-1 text-slate-600">{insight.summary}</p>
                          <span className="text-xs text-slate-500">{new Date(insight.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  <h4 className="font-semibold">Reviews</h4>
                  <div className="mt-2 space-y-3">
                    {current.reviews.map((review, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{review.by}</span>
                          <span className="text-xs text-slate-500">{new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <StarRow value={review.rating} size={14} />
                        <p className="text-sm mt-1">{review.comment}</p>
                        {(review.event_name || review.event_date || review.format) && (
                          <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                            Seen at: {review.event_name} ({review.format}) on {new Date(review.event_date || '').toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h4 className="font-semibold">Rate this Speaker</h4>
                  <form onSubmit={e => submitReview(e, current.id)} className="mt-2 space-y-2">
                    <input type="text" name="by" placeholder="Your Name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                    <select name="rater_chapter_id" required className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm">
                      <option value="">Your EO Chapter</option>
                      {CHAPTER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" name="rating" min="1" max="5" placeholder="Rating (1-5)" required className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                    <textarea name="comment" placeholder="Comment" required rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                    <input type="text" name="event_name" placeholder="Where did you see this speaker? (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                    <input type="date" name="event_date" className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                    <select name="format" className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm">
                      <option value="">Format (optional)</option>
                      <option value="talk">Talk</option>
                      <option value="workshop">Workshop</option>
                      <option value="panel">Panel</option>
                    </select>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Submit Review</button>
                  </form>
                </section>
                {flags.aiFeatures && (
                  <section>
                    <h4 className="font-semibold">✨ AI Event Planner</h4>
                    <button
                      type="button"
                      onClick={() => generateEventIdeas(current)}
                      className="mt-2 px-4 py-2 rounded-lg text-white text-sm bg-indigo-600 hover:bg-indigo-700"
                    >
                      Generate Event Ideas
                    </button>
                    {eventIdeas && (
                      <div className="mt-4 whitespace-pre-wrap text-sm">{eventIdeas}</div>
                    )}
                  </section>
                )}
              </div>
              <aside className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs font-semibold text-slate-600">Verification</div><div className="mt-1 text-sm text-slate-600">Last verified: {current.lastVerified ? new Date(current.lastVerified).toLocaleDateString() : '—'}</div></div>
                <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs font-semibold text-slate-600">Links</div><ul className="mt-1 text-sm text-indigo-700 space-y-1"><li><a href={current.links?.linkedin || '#'} className="hover:underline">LinkedIn</a></li><li><a href={current.links?.website || '#'} className="hover:underline">Website</a></li><li><a href={current.links?.video || '#'} className="hover:underline">Sample video</a></li></ul></div>
                {current.eventHistory && current.eventHistory.length > 0 && (<div className="rounded-xl border border-slate-200 p-3"><div className="text-xs font-semibold text-slate-600">EO Event History</div><ul className="mt-1 text-sm text-slate-700 space-y-1">{current.eventHistory.map((event, i) => (<li key={i}>{event.chapter} <span className="text-slate-500">({new Date(event.date).toLocaleDateString()})</span></li>))}</ul></div>)}
              </aside>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600">No profile selected.</div>
        )}
      </Modal>

      <Modal open={isLoginOpen} onClose={() => setLoginOpen(false)}>
        <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Admin Sign In</h2>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Username</label>
                    <input name="username" type="text" required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <input name="password" type="password" required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                {loginError && <p className="text-sm text-red-600 text-center">{loginError}</p>}
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Sign In
                </button>
            </form>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
            <div>
                <h2 className="text-2xl font-bold mb-4">Edit Speaker: {editing.name}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><label className="block text-xs font-semibold text-slate-600">Full name</label><input value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Chapter</label><input value={editing.chapter} onChange={e=>setEditing({...editing, chapter: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">City</label><input value={editing.city} onChange={e=>setEditing({...editing, city: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Country</label><input value={editing.country} onChange={e=>setEditing({...editing, country: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Type</label><select value={editing.type} onChange={e=>setEditing({...editing, type: e.target.value as any})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm">{Object.values(SPEAKER_TYPE).map(t=> <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mt-4">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Fees</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div><label className="block text-xs font-semibold text-slate-600">Min Fee (cents)</label><input type="number" value={editing.fee_min} onChange={e=>setEditing({...editing, fee_min: Number(e.target.value)})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                      <div><label className="block text-xs font-semibold text-slate-600">Max Fee (cents)</label><input type="number" value={editing.fee_max} onChange={e=>setEditing({...editing, fee_max: Number(e.target.value)})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                      <div><label className="block text-xs font-semibold text-slate-600">Currency</label><input value={editing.currency} onChange={e=>setEditing({...editing, currency: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    </div>
                    <div className="mt-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editing.has_eo_special_rate} onChange={e=>setEditing({...editing, has_eo_special_rate: e.target.checked})} />
                        <span>Has EO Special Rate</span>
                      </label>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-slate-600">EO Rate Note</label>
                      <input value={editing.eo_rate_note} onChange={e=>setEditing({...editing, eo_rate_note: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" />
                    </div>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600">Bio</label><textarea value={editing.bio} onChange={e=>setEditing({...editing, bio: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" rows={4} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><label className="block text-xs font-semibold text-slate-600">Topics (comma-separated)</label><input value={editing.topics.join(', ')} onChange={e=>setEditing({...editing, topics: e.target.value.split(',').map(t=>t.trim())})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Formats (comma-separated)</label><input value={editing.formats.join(', ')} onChange={e=>setEditing({...editing, formats: e.target.value.split(',').map(t=>t.trim())})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Languages (comma-separated)</label><input value={editing.languages.join(', ')} onChange={e=>setEditing({...editing, languages: e.target.value.split(',').map(t=>t.trim())})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><label className="block text-xs font-semibold text-slate-600">Email</label><input type="email" value={editing.contact.email} onChange={e=>setEditing({...editing, contact: {...editing.contact, email: e.target.value}})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Phone</label><input value={editing.contact.phone} onChange={e=>setEditing({...editing, contact: {...editing.contact, phone: e.target.value}})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><label className="block text-xs font-semibold text-slate-600">LinkedIn URL</label><input value={editing.links.linkedin} onChange={e=>setEditing({...editing, links: {...editing.links, linkedin: e.target.value}})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Website URL</label><input value={editing.links.website} onChange={e=>setEditing({...editing, links: {...editing.links, website: e.target.value}})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                    <div><label className="block text-xs font-semibold text-slate-600">Sample Video URL</label><input value={editing.links.video} onChange={e=>setEditing({...editing, links: {...editing.links, video: e.target.value}})} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">Photo</label>
                    <div className="mt-1 flex items-center gap-4">
                      <img src={editing.photoUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1">
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-sm" />
                        <input value={editing.photoUrl} onChange={e=>setEditing({...editing, photoUrl: e.target.value})} placeholder="Or paste image URL" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mt-4 mb-2">Insights</h4>
                    {editing.insights.map((insight, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input value={insight.title} onChange={e => handleArrayChange(index, 'title', e.target.value, 'insights')} placeholder="Title" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                        <input value={insight.link} onChange={e => handleArrayChange(index, 'link', e.target.value, 'insights')} placeholder="Link" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                        <button onClick={() => removeArrayItem(index, 'insights')} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">-</button>
                      </div>
                    ))}
                    <button onClick={() => addArrayItem('insights', { title: '', date: new Date().toISOString().slice(0,10), link: '#', summary: '' })} className="text-sm text-indigo-600">+ Add Insight</button>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mt-4 mb-2">Event History</h4>
                    {editing.eventHistory.map((event, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input value={event.chapter} onChange={e => handleArrayChange(index, 'chapter', e.target.value, 'eventHistory')} placeholder="Chapter" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                        <input type="date" value={event.date.slice(0,10)} onChange={e => handleArrayChange(index, 'date', e.target.value, 'eventHistory')} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 shadow-sm text-sm" />
                        <button onClick={() => removeArrayItem(index, 'eventHistory')} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">-</button>
                      </div>
                    ))}
                    <button onClick={() => addArrayItem('eventHistory', { chapter: '', date: new Date().toISOString().slice(0,10) })} className="text-sm text-indigo-600">+ Add Event</button>
                  </div>

                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
                    <button onClick={handleUpdateSpeaker} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Save Changes</button>
                </div>
            </div>
        )}
      </Modal>

    </div>
  );
}


