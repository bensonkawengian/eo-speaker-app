// This file will hold all our shared types and enums to avoid circular dependencies.

export const SPEAKER_TYPE = {
  MEMBER: "EO Member Speaker",
  PRO: "Professional (Non-EO)",
} as const;

export const FEE = {
  NO_FEE: "No Fee (Expenses)",
  EXPENSES: "Expenses Only",
  PAID: "Member-Pro (Paid)",
  PRO_PAID: "Pro Speaker (Paid)",
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
  fee: (typeof FEE)[keyof typeof FEE];
  rating: { avg: number; count: number; };
  lastVerified: string;
  bio: string;
  links: { linkedin: string; website: string; video: string; };
  contact: { email: string; phone: string; };
  reviews: { by: string; date: string; rating: number; comment: string; }[];
  insights: { title: string; date: string; link: string; summary: string; }[];
  eventHistory: { chapter: string; date: string; }[];
  photoUrl: string;
  rate?: {
    currency: string;
    min: number;
    max?: number;
    unit: string;
    notes: string;
    lastUpdated: string;
    discountMulti?: number;
  };
};

export type Nomination = {
  id: string;
  type: (typeof SPEAKER_TYPE)[keyof typeof SPEAKER_TYPE];
  fee: (typeof FEE)[keyof typeof FEE];
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
  rateLastUpdated: string;
};
