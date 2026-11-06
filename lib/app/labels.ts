import type { ActionStatus, AuditActorKind, BillingStatus, Permission, Role } from "@arca/contracts";

// The webapp's words for the contract's roles, billing statuses, permissions, action statuses and kinds of actor, kept in
// one place so Members, Help, Billing, the Action plan, the activity, ARCA's panel and the sidebar cannot word them
// differently. Each is a Record over the contract's type, so a value added there fails the typecheck until it gets words
// here.

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" };

export const BILLING_STATUS_LABEL: Record<BillingStatus, string> = {
  pending_payment: "Pending payment",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

/** Who wrote an audit row, by kind. The activity names a member by email; ARCA staff and the system go by these. */
export const ACTOR_KIND_LABEL: Record<AuditActorKind, string> = { member: "Member", platform: "ARCA staff", system: "System" };

/**
 * What each permission lets a role do, read after "can": "Owner can invite members". Where one stands alone, as a row of
 * the Members table, it starts with a capital.
 */
export const PERMISSION_LABEL: Record<Permission, string> = {
  "org.read": "see the organization and its analyses",
  "org.update": "edit the organization's details, make coverage requests and add evidence",
  "analysis.create": "save analyses to the organization",
  "actions.update": "change the status of actions",
  // Only the organization's own actions can be deleted; the assessment's only change status (DN-11 D13).
  "actions.assign": "assign actions and add or delete the organization's own",
  "activity.read": "see the organization's activity",
  "members.invite": "invite members",
  "members.remove": "remove members",
  "members.set_role": "change members' roles",
  "billing.manage": "manage billing",
  "org.transfer_ownership": "transfer ownership",
  "org.request_deletion": "request the organization's deletion",
};
