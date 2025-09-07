import React, { useMemo, useState, useEffect } from "react";
import { SPEAKER_TYPE, FEE, Speaker, Nomination, SpeakerReview } from './types';

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
  "EO - Non APAC & Others", "EO Malaysia", "EO Philippines", "EO Philippines South", "EO Singapore", "EO Vietnam", "EO APAC Bridge", "EO Bangkok Metropolitan", "EO Indonesia", "EO Indonesia East", "EO Thailand", "EO APAC Platinum One Bridge", "EO Adelaide", "EO Melbourne", "EO New Zealand", "EO Perth", "EO Queensland", "EO Sydney",
];

// =========================
// Main App Component
// =========================
export default function App() {
  const [tab, setTab] = useState<"speakers"|"nominate"|"admin">("speakers");
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [pending, setPending] = useState<Nomination[]>([]);
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
  const [nom, setNom] = useState<Omit<Nomination, 'id' | 'nominated_at'>>({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", referrerName: "", referrerChapter: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventDescription, setEventDescription] = useState("");
  const [matchingSpeakers, setMatchingSpeakers] = useState<Speaker[]>([]);
  const [eventIdeas, setEventIdeas] = useState<string>("");
  const [profileVersion, setProfileVersion] = useState(0);

  async function fetchData() {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      setSpeakers(data.speakers || []);
      setPending(data.nominations || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);
  
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
    const body = `Dear ${speaker.name},\n\nWe are interested in the possibility of having you speak at an upcoming EO event.\n\n[Your event details here]\n\nCould you please let us know your availability and requirements?\n\nBest regards,\n[Your Name]\n[Your Chapter]`;
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
      const response = await fetch('/api/nominations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nom),
      });
      const newNomination = await response.json();
      if (!response.ok) {
        throw new Error(newNomination.message || "Failed to submit nomination.");
      }
      await fetchData();
      alert("Nomination submitted successfully!");
      setNom({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", referrerName: "", referrerChapter: "" });
      setNominationBio("");
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }
  async function approveNom(n: Nomination) {
    try {
      const response = await fetch('/api/nominations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nominationId: n.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to approve nomination.");
      }
      await fetchData();
      alert(`${n.name} has been approved and added to the directory.`);
    } catch (error) {
      alert((error as Error).message);
    }
  }

  async function rejectNom(nominationId: string) {
    if (window.confirm("Are you sure you want to reject this nomination?")) {
      try {
        const response = await fetch('/api/nominations/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nominationId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to reject nomination.");
        }
        await fetchData();
      } catch (error) {
        alert((error as Error).message);
      }
    }
  }

  async function handleUpdateSpeaker() {
    if (!editing) return;
    try {
      const response = await fetch('/api/speakers/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update speaker.");
      }
      await fetchData();
      setEditing(null);
      setProfileVersion(v => v + 1);
    } catch (error) {
      alert((error as Error).message);
    }
  }

  async function handleDeleteSpeaker(speakerId: string) {
    if (window.confirm("Are you sure you want to delete this speaker?")) {
      try {
        const response = await fetch('/api/speakers/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speakerId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to delete speaker.");
        }
        await fetchData();
      } catch (error) {
        alert((error as Error).message);
      }
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

  async function submitReview(e: React.FormEvent<HTMLFormElement>, speakerId: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const review: Omit<SpeakerReview, 'date' | 'id'> = {
      by: formData.get('by') as string,
      rater_chapter_id: formData.get('rater_chapter_id') as string,
      rating: Number(formData.get('rating')),
      comment: formData.get('comment') as string,
      event_name: formData.get('event_name') as string || undefined,
      event_date: formData.get('event_date') as string || undefined,
      format: formData.get('format') as 'talk' | 'workshop' | 'panel' || undefined,
    };

    if (!review.by || !review.rater_chapter_id || !review.rating || !review.comment) return;

    try {
      const response = await fetch('/api/speakers/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerId, review }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit review.");
      }
      await fetchData();
      form.reset();
    } catch (error) {
      alert((error as Error).message);
    }
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

        {/* ... The rest of the JSX ... */}
      </main>
    </div>
  );
}
