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
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [nominationBio, setNominationBio] = useState("");
  const [topicSuggestion, setTopicSuggestion] = useState({ loading: false, error: "" });
  const [nom, setNom] = useState<Omit<Nomination, 'id'>>({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", rateLastUpdated: new Date().toISOString().slice(0,10) });
  const [pending, setPending] = useState<Nomination[]>([]);
  
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

  function suggestTopics() { /* Placeholder for Gemini API call */ }
  function submitNomination(e: React.FormEvent) { e.preventDefault(); }
  function approveNom(n: Nomination) { /* Placeholder */ }

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

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-slate-600">Type</label><select name="type" value={nom.type} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm">{Object.values(SPEAKER_TYPE).map(t=> <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-slate-600">Fee</label><select name="fee" value={nom.fee} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm">{Object.values(FEE).map(f=> <option key={f} value={f}>{f}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-slate-600">Full name</label><input name="name" required value={nom.name} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div><label className="text-xs font-semibold text-slate-600">Email</label><input name="email" required type="email" value={nom.email} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
                <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-600">Chapter / Company (optional)</label><input name="chapter" value={nom.chapter} onChange={handleNominationChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm" /></div>
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
              <div className="mt-4 flex items-center gap-3"><button type="submit" className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: `linear-gradient(90deg, ${EO.blue}, ${EO.orange})` }}>Submit</button></div>
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
                  {pending.length === 0 && <div className="mt-2 text-sm text-slate-500">No new nominations to review.</div>}
                  <div className="mt-4 space-y-4">
                    {pending.map(n=> (<div key={n.id} className="p-4 rounded-xl border bg-slate-50/70 shadow-sm"><div className="flex items-start justify-between"><div className="flex items-start gap-3"><Avatar name={n.name} size={40} /><div><div className="font-semibold text-slate-900">{n.name}</div><div className="text-sm text-slate-600">{n.type} {"\u00b7"} {n.fee}</div><a href={`mailto:${n.email}`} className="text-sm text-indigo-600 hover:underline">{n.email}</a></div></div><div className="text-right flex-shrink-0 ml-4">{(n.fee===FEE.PAID || n.fee===FEE.PRO_PAID) ? (n.rateMin ? (<div className="text-xs text-slate-600">EO rate: <span className="font-medium text-slate-800">{ratePreview({ currency: n.rateCurrency, min: Number(n.rateMin), max: n.rateMax?Number(n.rateMax):undefined, unit: n.rateUnit })}</span></div>) : (<Badge tone="orange">Rate Required</Badge>)) : (<Badge tone="green">No Fee</Badge>)}</div></div><div className="mt-3 border-t border-slate-200 pt-3 space-y-1.5">{n.chapter && <div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Chapter/Co:</strong> {n.chapter}</div>}{n.topics && <div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Topics:</strong> {n.topics}</div>}{(n.fee === FEE.PAID || n.fee === FEE.PRO_PAID) && n.rateNotes && (<div className="text-sm text-slate-700"><strong className="font-medium text-slate-800 w-28 inline-block">Rate Notes:</strong> {n.rateNotes}</div>)}</div><div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2"><button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors" onClick={()=>approveNom(n)}>Approve</button><button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors" onClick={()=>setPending(pending.filter(x=>x.id!==n.id))}>Reject</button></div></div>))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold">Manage Speakers</h3>
                    <div className="mt-4 space-y-3">
                        {speakers.map(sp => (<div key={sp.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50"><div className="flex items-center gap-3"><Avatar name={sp.name} src={sp.photoUrl} size={40}/><div><div className="font-semibold text-slate-900">{sp.name}</div><div className="text-xs text-slate-600">{sp.chapter}</div></div></div><button onClick={() => setEditing(JSON.parse(JSON.stringify(sp)))} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">Edit</button></div>))}
                    </div>
                </div>
              </>
            )}
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
      <Modal open={!!openId} onClose={()=>{ setOpenId(null); setShowContact(false); }}>
        {current ? (
          <div>
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
                <button onClick={() => setShowContact(true)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">Contact</button>
                <a href={current.links?.linkedin || '#'} className="text-sm text-indigo-700 hover:underline">LinkedIn</a>
              </div>
            </div>

            {showContact && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
                <div><strong>Email:</strong> <a href={`mailto:${current.contact.email}`} className="text-indigo-600">{current.contact.email}</a></div>
                <div><strong>Phone:</strong> {current.contact.phone}</div>
              </div>
            )}
            
            <div className="mt-5 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-5">
                {/* About, AI Intro, Topics, etc. */}
              </div>
              <aside className="space-y-3">
                {/* Verification, Links, Event History */}
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
                {/* Full Edit Speaker Form JSX goes here */}
            </div>
        )}
      </Modal>

    </div>
  );
}


