import { ATTORNEY_RANGES, ORG_CONTACT_ROLES, type AttorneyRange, type OrgContactRole, type OrgProfileInput } from "./checkout-contract";
import { isUsState, type UsStateCode } from "./us-states";

// The pre-checkout (DN-13 §19): what a firm says before paying, kept in this tab until the emailed code makes the account, then sent
// with POST /orgs. The rules are the back's (OrgProfileInput), so the page says what is wrong field by field before the back would.

export type ProfileDraft = {
  contactName: string;
  contactRole: OrgContactRole | "";
  phone: string;
  legalName: string;
  ein: string;
  line1: string;
  city: string;
  state: UsStateCode | "";
  postalCode: string;
  attorneyRange: AttorneyRange | "";
  practiceStates: UsStateCode[];
};

export const EMPTY_DRAFT: ProfileDraft = {
  contactName: "", contactRole: "", phone: "", legalName: "", ein: "", line1: "", city: "", state: "", postalCode: "", attorneyRange: "",
  practiceStates: [],
};

export type DraftField = keyof ProfileDraft;
export type FieldErrors = Partial<Record<DraftField, string>>;

export const CONTACT_ROLE_LABEL: Record<OrgContactRole, string> = {
  managing_partner: "Managing partner", partner: "Partner", office_manager: "Office manager", other: "Other",
};
// The bands as people write them, with an en dash.
export const ATTORNEY_RANGE_LABEL: Record<AttorneyRange, string> = { "1": "1", "2-5": "2–5", "6-20": "6–20", "21-50": "21–50", "50+": "50+" };

const PHONE = /^\+?[0-9 ().-]+$/;
const EIN = /^\d{2}-?\d{7}$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const digits = (value: string) => value.replace(/\D/g, "").length;

function text(value: string, max: number, missing: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return missing;
  if (trimmed.length > max) return `Use at most ${max} characters.`;
  return undefined;
}
const only = (errors: FieldErrors): FieldErrors =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== undefined)) as FieldErrors;

/** Step 1, "You": the full name and the role are required; the phone is optional, 10 to 15 digits, at most 20 characters. */
export function validateYou(draft: ProfileDraft): FieldErrors {
  const phone = draft.phone.trim();
  return only({
    contactName: text(draft.contactName, 120, "Enter your full name."),
    contactRole: (ORG_CONTACT_ROLES as readonly string[]).includes(draft.contactRole) ? undefined : "Choose your role.",
    phone: !phone || (phone.length <= 20 && PHONE.test(phone) && digits(phone) >= 10 && digits(phone) <= 15)
      ? undefined : "Enter a phone number with 10 to 15 digits, or leave it empty.",
  });
}

/** Step 2, "Your firm": everything but the EIN is required, and the address is a US one. */
export function validateFirm(draft: ProfileDraft): FieldErrors {
  const ein = draft.ein.trim();
  return only({
    legalName: text(draft.legalName, 200, "Enter the firm's legal name."),
    ein: !ein || EIN.test(ein) ? undefined : "An EIN has 9 digits, like 12-3456789. You can leave it empty.",
    line1: text(draft.line1, 200, "Enter the street address."),
    city: text(draft.city, 100, "Enter the city."),
    state: draft.state && isUsState(draft.state) ? undefined : "Choose the state.",
    postalCode: ZIP.test(draft.postalCode.trim()) ? undefined : "Enter a 5-digit ZIP code, or ZIP+4.",
    attorneyRange: (ATTORNEY_RANGES as readonly string[]).includes(draft.attorneyRange) ? undefined : "Choose how many attorneys work at the firm.",
    practiceStates: draft.practiceStates.length > 0 ? undefined : "Choose at least one state where the firm practices.",
  });
}

/** The draft as POST /orgs takes it. Only call it on a draft both steps accept. */
export function profileOf(draft: ProfileDraft): OrgProfileInput {
  const ein = draft.ein.trim().replace("-", "");
  return {
    contactName: draft.contactName.trim(),
    contactRole: draft.contactRole as OrgContactRole,
    phone: draft.phone.trim() || null,
    legalName: draft.legalName.trim(),
    ein: ein ? `${ein.slice(0, 2)}-${ein.slice(2)}` : null,
    billingAddress: { line1: draft.line1.trim(), city: draft.city.trim(), state: draft.state as UsStateCode, postalCode: draft.postalCode.trim() },
    attorneyRange: draft.attorneyRange as AttorneyRange,
    practiceStates: [...draft.practiceStates],
  };
}

// The draft lives in sessionStorage, so a reload keeps three steps of typing and nothing outlives the tab. Keyed by the claim: another
// scan starts afresh. It goes once the organization exists.
type Saved = { draft: ProfileDraft; planCode: string | null; step: 1 | 2 | 3 };
const key = (claimId: string) => `arca.precheckout.${claimId}`;

export function loadDraft(claimId: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(key(claimId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Saved>;
    if (!saved.draft || typeof saved.draft !== "object") return null;
    const step = saved.step === 2 || saved.step === 3 ? saved.step : 1;
    return { draft: { ...EMPTY_DRAFT, ...saved.draft }, planCode: typeof saved.planCode === "string" ? saved.planCode : null, step };
  } catch {
    return null;
  }
}

export function saveDraft(claimId: string, saved: Saved): void {
  try {
    sessionStorage.setItem(key(claimId), JSON.stringify(saved));
  } catch {
    // Storage full or blocked: the form still works, it only forgets on a reload.
  }
}

export function clearDraft(claimId: string): void {
  try {
    sessionStorage.removeItem(key(claimId));
  } catch {
    // Nothing to clear.
  }
}
