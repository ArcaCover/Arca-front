// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).
// Generic on purpose: no real regulator, court or case is named (CLAUDE.md §7).
import { daysAgo } from "./dates";

export type AlertCategory = "regulatory" | "firm" | "industry";
export type AlertSeverity = "info" | "medium" | "high";
export type SampleAlert = {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  summary: string;
  suggestedAction: string;
  at: string;
  read: boolean;
};

export const ALERT_CATEGORY: Record<AlertCategory, string> = {
  regulatory: "Regulatory",
  firm: "Firm signals",
  industry: "Industry",
};

export const ALERT_SEVERITY: Record<AlertSeverity, string> = { info: "Info", medium: "Medium", high: "High" };

export const SAMPLE_ALERTS: SampleAlert[] = [
  {
    id: "al_guidance", category: "regulatory", severity: "medium", at: daysAgo(1), read: false,
    title: "A state bar published new guidance on generative AI in filings",
    summary: "The guidance asks lawyers to verify every citation produced with AI and to supervise staff who use it.",
    suggestedAction: "Add a citation check to your filing checklist.",
  },
  {
    id: "al_site_policy", category: "firm", severity: "high", at: daysAgo(3), read: false,
    title: "Your website no longer links to an AI policy",
    summary: "The monthly re-scan could not find the AI policy page it found last time.",
    suggestedAction: "Restore the page or tell us where it moved.",
  },
  {
    id: "al_sanctions", category: "industry", severity: "medium", at: daysAgo(6), read: false,
    title: "More courts are sanctioning filings with invented citations",
    summary: "Sanctions for AI-generated citations that do not exist keep appearing across jurisdictions.",
    suggestedAction: "Review how your team checks AI-drafted research.",
  },
  {
    id: "al_new_attorney", category: "firm", severity: "info", at: daysAgo(10), read: true,
    title: "A new attorney appears on your website",
    summary: "The re-scan found a profile that was not there before. Their bar standing will be checked on the next scan.",
    suggestedAction: "No action needed.",
  },
  {
    id: "al_disclosure", category: "regulatory", severity: "info", at: daysAgo(17), read: true,
    title: "A proposed rule would require disclosing AI use to clients",
    summary: "The proposal is open for comment. It would not apply until it is adopted.",
    suggestedAction: "Decide how you would tell clients, in case it passes.",
  },
  {
    id: "al_vendor", category: "industry", severity: "info", at: daysAgo(24), read: true,
    title: "AI vendors are changing their data retention terms",
    summary: "Several providers updated how long they keep prompts on consumer plans.",
    suggestedAction: "Check the retention settings of the tools your firm uses.",
  },
];
