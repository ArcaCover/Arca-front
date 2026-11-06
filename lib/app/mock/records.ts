// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).
import { daysAgo, daysAhead, lastMonths } from "./dates";

// ---- Score history and benchmark (Overview, analysis History tab). Illustrative: not computed from real scans or firms.
const MONTHS = lastMonths(6);
export const SAMPLE_SCORE_HISTORY = [58, 61, 60, 64, 67, 70].map((value, index) => ({ label: MONTHS[index], value }));
export const SAMPLE_BENCHMARK = { percentile: 62, peers: "law firms of 2 to 50 attorneys in your state" };

export const NEXT_RESCAN = daysAhead(12);

// ---- Documents (/app/documents)
export type SampleDocument = { id: string; name: string; kind: "template" | "policy" | "report"; description: string; updated: string };

export const SAMPLE_TEMPLATES: SampleDocument[] = [
  { id: "doc_policy", name: "AI use policy template", kind: "template", updated: daysAgo(20), description: "A starting point for a one-page firm policy." },
  { id: "doc_checklist", name: "Supervision checklist for AI-drafted work", kind: "template", updated: daysAgo(35), description: "What a reviewer checks before work leaves the firm." },
  { id: "doc_incident", name: "AI incident response plan", kind: "template", updated: daysAgo(48), description: "Who does what in the first 48 hours after an AI error." },
  { id: "doc_engagement", name: "Client disclosure language", kind: "template", updated: daysAgo(61), description: "Sample wording for engagement letters about AI use." },
];

// ---- Invoices (/app/billing). No amounts on purpose: the preview does not invent charges.
export type SampleInvoice = { id: string; period: string; issued: string; status: "paid" | "open" };
export const SAMPLE_INVOICES: SampleInvoice[] = [
  { id: "INV-0003", period: MONTHS[5], issued: daysAgo(6), status: "open" },
  { id: "INV-0002", period: MONTHS[4], issued: daysAgo(37), status: "paid" },
  { id: "INV-0001", period: MONTHS[3], issued: daysAgo(67), status: "paid" },
];

// ---- Security (/app/settings)
export const SAMPLE_SESSIONS = [
  { id: "ss_1", device: "Chrome on Windows", place: "This device", at: daysAgo(0), current: true },
  { id: "ss_2", device: "Safari on iPhone", place: "Miami, FL", at: daysAgo(2), current: false },
  { id: "ss_3", device: "Edge on Windows", place: "Miami, FL", at: daysAgo(9), current: false },
];

// ---- Coverage (/app/coverage). Limits only: there is no premium until ARCA has a carrier (CLAUDE.md §6.3).
export const ILLUSTRATIVE_LIMITS = [
  { key: "essential", name: "Essential", perClaim: "$50K", aggregate: "$100K", note: "The lowest limits." },
  { key: "professional", name: "Professional", perClaim: "$250K", aggregate: "$500K", note: "The middle option." },
  { key: "complete", name: "Complete", perClaim: "$1M", aggregate: "$2M", note: "The highest limits." },
];
