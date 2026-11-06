// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).
import { daysAhead } from "./dates";

export type ActionStatus = "todo" | "in_progress" | "done";
export type SampleAction = {
  id: string;
  title: string;
  detail: string;
  domain: string;
  points: number;
  status: ActionStatus;
  assignee: string | null;
  due: string | null;
  /** True for the preview's own items; false for one taken from a real assessment. */
  sample: boolean;
};

export const ACTION_STATUSES: { key: ActionStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export const SAMPLE_ACTIONS: SampleAction[] = [
  {
    id: "act_policy", title: "Adopt a written AI use policy", domain: "Governance & policy", points: 8, status: "in_progress",
    assignee: "tm_dana", due: daysAhead(9), sample: true,
    detail: "One page that names the approved tools, who owns the policy and how often it is reviewed.",
  },
  {
    id: "act_review", title: "Require a second review of AI-drafted filings", domain: "Human oversight", points: 7,
    status: "todo", assignee: "tm_luis", due: daysAhead(14), sample: true,
    detail: "A checklist step before filing: every citation produced with AI is checked against the source.",
  },
  {
    id: "act_tools", title: "Move the team to enterprise AI accounts", domain: "Tool environment", points: 6, status: "todo",
    assignee: "tm_priya", due: daysAhead(30), sample: true,
    detail: "Consumer accounts may keep prompts. Enterprise plans let the firm control retention.",
  },
  {
    id: "act_client_data", title: "Stop pasting client data into public tools", domain: "Data protection", points: 6,
    status: "todo", assignee: "tm_priya", due: daysAhead(7), sample: true,
    detail: "Write down what may and may not go into an AI tool, with examples from your practice.",
  },
  {
    id: "act_training", title: "Run a one-hour AI limits session", domain: "Training", points: 4, status: "done",
    assignee: "tm_sam", due: null, sample: true,
    detail: "Cover hallucinated citations, confidentiality and when to disclose AI use to a client.",
  },
  {
    id: "act_incident", title: "Name who answers an AI incident", domain: "Incident preparedness", points: 3, status: "todo",
    assignee: null, due: daysAhead(21), sample: true,
    detail: "One person and a short plan: what to check, who to tell and how to fix the work product.",
  },
];
