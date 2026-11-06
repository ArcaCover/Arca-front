import type { AuditActorKind } from "@arca/contracts";

import { ApiError } from "@/lib/api/client";

// What the tabs of ARCA's panel share. The panel has no organization of its own, so a failure is only a message here: the
// admin routes answer 403 to anyone who is not a platform admin, and there is no payment to send anyone to.

export const messageOf = (cause: unknown) => (cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");

export const ACTOR_KIND_LABEL: Record<AuditActorKind, string> = { member: "Member", platform: "ARCA staff", system: "System" };
