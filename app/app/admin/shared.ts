import type { AuditActorKind, BillingStatus, Role } from "@arca/contracts";

import { ApiError } from "@/lib/api/client";

// What the tabs of ARCA's panel share. The panel has no organization of its own, so a failure is only a message here: the
// admin routes answer 403 to anyone who is not a platform admin, and there is no payment to send anyone to.

export const messageOf = (cause: unknown) => (cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");

// Worded like Billing's own status line.
export const BILLING_LABEL: Record<BillingStatus, string> = {
  pending_payment: "Pending payment",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" };

export const ACTOR_KIND_LABEL: Record<AuditActorKind, string> = { member: "Member", platform: "ARCA staff", system: "System" };
