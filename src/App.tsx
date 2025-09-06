import React, { useMemo, useState, useEffect } from "react";
import { SPEAKER_TYPE, FEE, Speaker, Nomination, SpeakerReview } from './types';

// ... (all the helper and UI components)

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
  // ... (all other state declarations)
  
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

  // ... (filtered, handleLogin, handleNominationChange, etc.)

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
      await fetchData(); // Re-fetch data
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
        await fetchData(); // Re-fetch data
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
      await fetchData(); // Re-fetch data
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
        await fetchData(); // Re-fetch data
      } catch (error) {
        alert((error as Error).message);
      }
    }
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
      await fetchData(); // Re-fetch data
      form.reset();
    } catch (error) {
      alert((error as Error).message);
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
      await fetchData(); // Re-fetch data
      alert("Nomination submitted successfully!");
      setNom({ type: SPEAKER_TYPE.MEMBER, fee: FEE.NO_FEE, name: "", email: "", chapter: "", topics: "", formats: "", rateCurrency: "USD", rateMin: "", rateMax: "", rateUnit: "per talk", rateNotes: "", referrerName: "", referrerChapter: "" });
      setNominationBio("");
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ... (the rest of the functions and the full JSX)
}
