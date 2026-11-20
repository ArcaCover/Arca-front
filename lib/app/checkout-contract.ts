// DN-13 §19: the pre-checkout's shapes are new exports of @arca/contracts 0.5.0 (OrgProfileInput, CreateOrgWithProfileRequest,
// CheckoutSessionRequest, EmbeddedCheckoutResponse, ORG_CONTACT_ROLES, ATTORNEY_RANGES), which is not released yet. As with
// enroll-contract.ts, the front keeps installing 0.4.0 from its release tarball and mirrors them here with the back's rules
// (packages/contracts/src/webapp.ts in Arca-back). At 0.5.0 this file re-exports them from "@arca/contracts".
import type { UsStateCode } from "./us-states";

export const ORG_CONTACT_ROLES = ["managing_partner", "partner", "office_manager", "other"] as const;
export type OrgContactRole = (typeof ORG_CONTACT_ROLES)[number];
export const ATTORNEY_RANGES = ["1", "2-5", "6-20", "21-50", "50+"] as const;
export type AttorneyRange = (typeof ATTORNEY_RANGES)[number];

/** The firm profile POST /orgs takes with the claim, normalized as the back keeps it (the EIN as 12-3456789). */
export type OrgProfileInput = {
  contactName: string;
  contactRole: OrgContactRole;
  phone: string | null;
  legalName: string;
  ein: string | null;
  billingAddress: { line1: string; city: string; state: UsStateCode; postalCode: string };
  attorneyRange: AttorneyRange;
  practiceStates: UsStateCode[];
};

/** What POST /orgs/:id/billing/checkout answers with `uiMode: "embedded"`: the secret Stripe.js mounts Checkout with. */
export type EmbeddedCheckoutResponse = { clientSecret: string; sessionId: string };

// Strict, as the contract is: a field more is a deployment that does not match.
export const EmbeddedCheckoutResponse = {
  parse(value: unknown): EmbeddedCheckoutResponse {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Not an embedded checkout");
    const { clientSecret, sessionId } = value as { clientSecret?: unknown; sessionId?: unknown };
    const text = (field: unknown, max: number) => typeof field === "string" && field.length > 0 && field.length <= max;
    if (Object.keys(value).length !== 2 || !text(clientSecret, 2048) || !text(sessionId, 255)) throw new Error("Not an embedded checkout");
    return { clientSecret: clientSecret as string, sessionId: sessionId as string };
  },
};
