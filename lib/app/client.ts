import {
  ActionItemView,
  ActionPlanResponse,
  ActivityPage,
  AdminAuditPage,
  AdminMetricsView,
  AdminOrgDetailView,
  AdminOrgView,
  AnalysisView,
  ClaimResponse,
  DeletionRequestView,
  InvitationView,
  MeResponse,
  MemberView,
  OrgView,
  PlanView,
  UrlResponse,
  type CreateActionRequest,
  type InviteRequest,
  type SetRoleRequest,
  type UpdateActionRequest,
  type UpdatePlanRequest,
} from "@arca/contracts";

import { ApiError, apiFailure, apiParse, apiSend } from "@/lib/api/client";

import { loadAppSession } from "./session";

// One function per route of the private webapp's API (DN-10 section 4.7, DN-11 section 4.9). The back is the one that
// denies: a 402, 403, 410 or 429 reaches the page as an ApiError to react to, never something this client decides on its
// own. The mock-only seed of DN-11 is not here: its route is debug code, in lib/debug/mock-seed.ts.

type Init = { method?: string; body?: unknown };

// `authenticated: false` is for the two public routes only. Every other route needs the signed-in user, and without a
// session there is no point in asking.
async function request(path: string, { method, body }: Init = {}, authenticated = true): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authenticated) {
    const session = loadAppSession();
    if (!session) throw new ApiError("unauthorized", "Sign in to continue.");
    headers.Authorization = `Bearer ${session.token}`;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await apiSend(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await apiFailure(response);
  return response;
}

// Every answer is parsed against the contract before a page sees it, as in lib/api/client.ts.
async function json<T>(schema: { parse: (value: unknown) => T }, path: string, init?: Init, authenticated?: boolean): Promise<T> {
  const response = await request(path, init, authenticated);
  return apiParse(schema, await response.json().catch(() => null));
}

// The contract has a schema for each list but not for the pair the member screen needs.
const MembersResponse = {
  parse(value: unknown) {
    const { members, invitations } = (value ?? {}) as { members?: unknown; invitations?: unknown };
    return { members: MemberView.array().parse(members), invitations: InvitationView.array().parse(invitations) };
  },
};

const org = (id: string) => `/orgs/${encodeURIComponent(id)}`;

// The query of a paged list, with only the values given.
function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) if (value !== undefined) params.set(name, String(value));
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Public: the plans are shown to a visitor who has not signed in yet. */
export const getPlans = () => json(PlanView.array(), "/plans", undefined, false);

/** Public: the scan token in the body is what authorizes it, before the visitor has any account (DN-10 section 4.7). */
export const createClaim = (scanToken: string) =>
  json(ClaimResponse, "/claims", { method: "POST", body: { scanToken } }, false);

export const getMe = () => json(MeResponse, "/me");

export const createOrg = (name: string, claimId: string) =>
  json(OrgView, "/orgs", { method: "POST", body: { name, claimId } });

export const getOrg = (id: string) => json(OrgView, org(id));

/** Takes org.update and no payment, so a name can be fixed before the first one (DN-11 section 4.4). */
export const renameOrg = (id: string, name: string) => json(OrgView, org(id), { method: "PATCH", body: { name } });

export const listAnalyses = (orgId: string) => json(AnalysisView.array(), `${org(orgId)}/analyses`);

export const attachAnalysis = (orgId: string, claimId: string) =>
  json(AnalysisView, `${org(orgId)}/analyses`, { method: "POST", body: { claimId } });

export const listMembers = (orgId: string) => json(MembersResponse, `${org(orgId)}/members`);

export const invite = (orgId: string, email: string, role: InviteRequest["role"]) =>
  json(InvitationView, `${org(orgId)}/invitations`, { method: "POST", body: { email, role } });

export async function revokeInvitation(orgId: string, id: string): Promise<void> {
  await request(`${org(orgId)}/invitations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export const setMemberRole = (orgId: string, userId: string, role: SetRoleRequest["role"]) =>
  json(MemberView, `${org(orgId)}/members/${encodeURIComponent(userId)}`, { method: "PATCH", body: { role } });

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await request(`${org(orgId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export const acceptInvitation = (token: string) =>
  json(OrgView, `/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });

export const checkout = (orgId: string, planCode: string) =>
  json(UrlResponse, `${org(orgId)}/billing/checkout`, { method: "POST", body: { planCode } });

export const portal = (orgId: string) => json(UrlResponse, `${org(orgId)}/billing/portal`, { method: "POST" });

export const requestDeletion = (orgId: string, reason: string) =>
  json(DeletionRequestView, `${org(orgId)}/deletion-request`, { method: "POST", body: { reason } });

// The action plan (DN-11 section 4.2). An action's key holds dots and colons, so it is encoded like any other path part.
const action = (orgId: string, key: string) => `${org(orgId)}/actions/${encodeURIComponent(key)}`;

export const getActionPlan = (orgId: string) => json(ActionPlanResponse, `${org(orgId)}/actions`);

/** Adds one of the organization's own actions (actions.assign). */
export const createAction = (orgId: string, item: CreateActionRequest) =>
  json(ActionItemView, `${org(orgId)}/actions`, { method: "POST", body: item });

/** A status alone takes actions.update; an assignee or a due date, even null to clear it, takes actions.assign. */
export const updateAction = (orgId: string, key: string, change: UpdateActionRequest) =>
  json(ActionItemView, action(orgId, key), { method: "PATCH", body: change });

/** Only the organization's own actions can be deleted; the back refuses an assessment's with a 400 (D13). */
export async function deleteAction(orgId: string, key: string): Promise<void> {
  await request(action(orgId, key), { method: "DELETE" });
}

/** Newest first. `before` is the `nextBefore` of the previous page (DN-11 section 4.3). Takes activity.read and no payment. */
export const listActivity = (orgId: string, page: { before?: number; limit?: number } = {}) =>
  json(ActivityPage, `${org(orgId)}/activity${query(page)}`);

export const adminListOrganizations = () => json(AdminOrgView.array(), "/admin/organizations");

export const adminGetOrganization = (id: string) =>
  json(AdminOrgDetailView, `/admin/organizations/${encodeURIComponent(id)}`);

/** ARCA's audit across organizations, newest first; `orgId` narrows it to one (DN-11 section 4.5). */
export const adminListAudit = (filter: { orgId?: string; before?: number; limit?: number } = {}) =>
  json(AdminAuditPage, `/admin/audit${query(filter)}`);

export const adminGetMetrics = () => json(AdminMetricsView, "/admin/metrics");

export const adminListDeletionRequests = () => json(DeletionRequestView.array(), "/admin/deletion-requests");

export const adminReviewDeletion = (id: string, decision: "approve" | "reject", note?: string) =>
  json(DeletionRequestView, `/admin/deletion-requests/${encodeURIComponent(id)}/${decision}`, {
    method: "POST",
    body: { note },
  });

export const adminListPlans = () => json(PlanView.array(), "/admin/plans");

export const adminUpdatePlan = (code: string, patch: UpdatePlanRequest) =>
  json(PlanView, `/admin/plans/${encodeURIComponent(code)}`, { method: "PUT", body: patch });
