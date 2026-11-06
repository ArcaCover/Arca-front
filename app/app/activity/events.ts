import type { ActivityEventView } from "@arca/contracts";

import { formatDate } from "@/components/app/ui";

// The front's words for each audited action (DN-11 §6.4): the organization's activity and ARCA's audit both read this one
// map, so an event reads the same in both. The back sends the action as it stored it; an action it adds later still shows,
// under its own name, until it gets words here.

export type EventKind = "members" | "actions" | "analyses" | "organization" | "billing" | "other";

export const EVENT_KINDS: Record<EventKind, string> = {
  members: "Members",
  actions: "Action plan",
  analyses: "Analyses",
  organization: "Organization",
  billing: "Billing",
  other: "Other",
};

type ActionLabel = {
  kind: Exclude<EventKind, "other">;
  /** What the actor did, read after their name: "changed the role of". */
  text: string;
  /** Whether the back's target label ends the sentence. Not where the target is the actor or the organization itself. */
  target: boolean;
};

export const ACTION_LABELS: Record<string, ActionLabel> = {
  "org.created": { kind: "organization", text: "created the organization", target: false },
  "org.renamed": { kind: "organization", text: "renamed the organization", target: false },
  "org.deletion_requested": { kind: "organization", text: "asked ARCA to delete the organization", target: false },
  "org.deletion_approved": { kind: "organization", text: "approved the deletion of the organization", target: false },
  "org.deletion_rejected": { kind: "organization", text: "turned down the deletion of the organization", target: false },
  "analysis.claimed": { kind: "analyses", text: "saved the analysis of", target: true },
  "member.invited": { kind: "members", text: "invited", target: true },
  // Also written when an invitation is accepted, sent again or its member removed, so it says closed rather than revoked.
  "invitation.revoked": { kind: "members", text: "closed the invitation for", target: true },
  "member.joined": { kind: "members", text: "joined the organization", target: false },
  "member.role_changed": { kind: "members", text: "changed the role of", target: true },
  "member.removed": { kind: "members", text: "removed", target: true },
  "action.created": { kind: "actions", text: "added the action", target: true },
  "action.updated": { kind: "actions", text: "updated the action", target: true },
  "action.deleted": { kind: "actions", text: "deleted the action", target: true },
  "billing.event_applied": { kind: "billing", text: "recorded a billing update", target: false },
  "plan.updated": { kind: "billing", text: "changed the plan", target: true },
};

// Own keys only: a stored string such as "constructor" is not one of ours.
const lookup = <T>(map: Record<string, T>, key: string): T | undefined => (Object.hasOwn(map, key) ? map[key] : undefined);

/** The sentence after the actor's name, and the kind the filters group it under. */
export function describeAction(action: string, targetLabel: string | null): { kind: EventKind; text: string } {
  const label = lookup(ACTION_LABELS, action);
  if (!label) return { kind: "other", text: targetLabel ? `recorded “${action}” on ${targetLabel}` : `recorded “${action}”` };
  return { kind: label.kind, text: label.target && targetLabel ? `${label.text} ${targetLabel}` : label.text };
}

const ROLE: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" };
const STATUS: Record<string, string> = { todo: "To do", in_progress: "In progress", done: "Done" };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What changed, in words: "Role: Member → Admin". The back sends only an allowed field (a role, an action's status, a name
 * or a due date), and which one follows from the action. A value that was not there before shows alone.
 */
export function describeChange(action: string, change: NonNullable<ActivityEventView["change"]>): string {
  const values = [change.from, change.to].filter((value): value is string => value !== null);
  let field = "Change";
  let word = (value: string) => value;
  if (action.startsWith("member.")) {
    field = "Role";
    word = value => lookup(ROLE, value) ?? value;
  } else if (action.startsWith("org.")) {
    field = "Name";
  } else if (values.some(value => lookup(STATUS, value))) {
    field = "Status";
    word = value => lookup(STATUS, value) ?? value;
  } else if (values.some(value => DAY.test(value))) {
    field = "Due date";
    word = value => (DAY.test(value) ? formatDate(value) : value);
  }
  const to = change.to === null ? "none" : word(change.to);
  return change.from === null ? `${field}: ${to}` : `${field}: ${word(change.from)} → ${to}`;
}

const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", timeZone: "UTC" };
/** The time of day of an event, in UTC like every date in /app. */
export const formatTime = (iso: string) => `${new Date(iso).toLocaleTimeString("en-US", TIME)} UTC`;
