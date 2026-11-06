import type { ActivityEventView } from "@arca/contracts";

import { formatDate } from "@/components/app/ui";
import { ROLE_LABEL } from "@/lib/app/labels";

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
  /** What the actor did, read after their name: "renamed the organization", "changed the role of". */
  text: string;
  /**
   * Set where the back's target label ends the sentence ("changed the role of member@firm.com"), and read instead when the
   * back could not name the target, a profile or a scan that is gone: a generic noun takes its place, so no sentence ends
   * on a dangling "of". Not where the target is the actor or the organization itself.
   */
  unnamed?: string;
};

export const ACTION_LABELS: Record<string, ActionLabel> = {
  "org.created": { kind: "organization", text: "created the organization" },
  "org.renamed": { kind: "organization", text: "renamed the organization" },
  "org.deletion_requested": { kind: "organization", text: "asked ARCA to delete the organization" },
  "org.deletion_approved": { kind: "organization", text: "approved the deletion of the organization" },
  "org.deletion_rejected": { kind: "organization", text: "turned down the deletion of the organization" },
  "analysis.claimed": { kind: "analyses", text: "saved the analysis of", unnamed: "saved an analysis" },
  "member.invited": { kind: "members", text: "invited", unnamed: "sent an invitation" },
  // Also written when an invitation is accepted, sent again or its member removed, so it says closed rather than revoked.
  "invitation.revoked": { kind: "members", text: "closed the invitation for", unnamed: "closed an invitation" },
  // The member who joined is the target; see describeAction for a join someone else made.
  "member.joined": { kind: "members", text: "joined the organization" },
  "member.role_changed": { kind: "members", text: "changed the role of", unnamed: "changed a member's role" },
  "member.removed": { kind: "members", text: "removed", unnamed: "removed a member" },
  "action.created": { kind: "actions", text: "added the action", unnamed: "added an action" },
  "action.updated": { kind: "actions", text: "updated the action", unnamed: "updated an action" },
  "action.deleted": { kind: "actions", text: "deleted the action", unnamed: "deleted an action" },
  "billing.event_applied": { kind: "billing", text: "recorded a billing update" },
  "plan.updated": { kind: "billing", text: "changed the plan", unnamed: "changed a plan" },
};

/** Who acted, as far as the words depend on it: whether a member of the organization, and their email when the back has it. */
export type EventActor = { member: boolean; email: string | null };

// Own keys only: a stored string such as "constructor" is not one of ours.
const lookup = <T>(map: Record<string, T>, key: string): T | undefined => (Object.hasOwn(map, key) ? map[key] : undefined);

/** The sentence after the actor's name, and the kind the filters group it under. */
export function describeAction(
  action: string,
  targetLabel: string | null,
  actor: EventActor,
): { kind: EventKind; text: string } {
  const label = lookup(ACTION_LABELS, action);
  if (!label) return { kind: "other", text: targetLabel ? `recorded “${action}” on ${targetLabel}` : `recorded “${action}”` };
  // Someone who accepts an invitation joins on their own. A join anyone else made, as the demo seed does as the system
  // (DN-11 §4.3), would otherwise read "System joined the organization" and drop who joined.
  if (action === "member.joined" && !(actor.member && actor.email === targetLabel)) {
    return { kind: label.kind, text: `added ${targetLabel ?? "a member"} to the organization` };
  }
  if (label.unnamed === undefined) return { kind: label.kind, text: label.text };
  return { kind: label.kind, text: targetLabel ? `${label.text} ${targetLabel}` : label.unnamed };
}

const STATUS: Record<string, string> = { todo: "To do", in_progress: "In progress", done: "Done" };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What changed, in words: "Role: Member → Admin". The back sends only an allowed field (a role, an action's status, a name
 * or a due date), and which one follows from the action. A value that was not there before shows alone, and so does the
 * role of a removed member, who has none afterwards: "Role: Admin" rather than "Role: Admin → none".
 */
export function describeChange(action: string, sent: NonNullable<ActivityEventView["change"]>): string {
  const change = action === "member.removed" ? { from: null, to: sent.from } : sent;
  const values = [change.from, change.to].filter((value): value is string => value !== null);
  let field = "Change";
  let word = (value: string) => value;
  if (action.startsWith("member.")) {
    field = "Role";
    word = value => lookup(ROLE_LABEL, value) ?? value;
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
