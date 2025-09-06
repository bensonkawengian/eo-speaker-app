// This file will hold all our shared types and enums to avoid circular dependencies.

export const SPEAKER_TYPE = {
  MEMBER: "EO Member Speaker",
  PRO: "Professional (Non-EO)",
} as const;

// We define a base type for a speaker here
export type Speaker = {
  id: string;
  type: (typeof SPEAKER_TYPE)[keyof typeof SPEAKER_TYPE];
  name: string;
  chapter: string;
  city: string;
  country: string;
  topics: string[];
  formats: string[];
  languages: string[];
  rating: { avg: number; count: number; };
  lastVerified: string;
  bio: string;
  links: { linkedin: string; website: string; video: string; };
  contact: { email: string; phone: string; };
  reviews: { by: string; date: string; rating: number; comment: string; rater_chapter_id: string; event_name?: string; event_date?: string; format?: 'talk' | 'workshop' | 'panel'; }[];
  insights: { title: string; date: string; link: string; summary: string; }[];
  eventHistory: { chapter: string; date: string; }[];
  photoUrl: string;
  fee_min?: number;
  fee_max?: number;
  currency?: string;
  has_eo_special_rate?: boolean;
  eo_rate_note?: string;
};

export type Nomination = {
  id: string;
  type: (typeof SPEAKER_TYPE)[keyof typeof SPEAKER_TYPE];
  name: string;
  email: string;
  chapter: string;
  topics: string;
  formats: string;
  rateCurrency: string;
  rateMin: string;
  rateMax: string;
  rateUnit: string;
  rateNotes: string;
  nominated_at: string;
  referrerName: string;
  referrerChapter: string;
};
