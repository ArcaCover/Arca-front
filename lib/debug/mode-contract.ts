// DN-13 §7.6, T19: in @arca/contracts 0.5.0, DebugModeResponse gains `webapp` ("simulated" | "real") and `billing`
// ("simulated" | "test"): which webapp the back built and what bills it. 0.5.0 is not released yet, and the 0.4.0 schema is
// strict, so it would call a newer back's answer another shape. As with lib/app/enroll-contract.ts, the front keeps
// installing 0.4.0 from its release tarball (never a `file:` dependency) and mirrors the two fields here with the back's rules
// (packages/contracts/src/debug.ts in Arca-back), checking the rest with the 0.4.0 schema. At 0.5.0 this file becomes
//   export { DebugModeResponse } from "@arca/contracts/debug";
// and nothing that imports it changes. Debug-only: only lib/debug and components/debug import it.
import { DebugModeResponse as DebugModeResponseV04 } from "@arca/contracts/debug";

export type WebappProviders = "simulated" | "real";
/** Never "live": a live Stripe key stops every debug mode of the back at start (DN-13 §16.1). */
export type BillingProviders = "simulated" | "test";

export type DebugModeResponse = DebugModeResponseV04 & { webapp: WebappProviders; billing: BillingProviders };

const WEBAPP: readonly unknown[] = ["simulated", "real"] satisfies WebappProviders[];
const BILLING: readonly unknown[] = ["simulated", "test"] satisfies BillingProviders[];

export const DebugModeResponse = {
  safeParse(value: unknown): { success: true; data: DebugModeResponse } | { success: false } {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { success: false };
    const { webapp, billing, ...rest } = value as Record<string, unknown>;
    if (!WEBAPP.includes(webapp) || !BILLING.includes(billing)) return { success: false };
    const parsed = DebugModeResponseV04.safeParse(rest);
    if (!parsed.success) return { success: false };
    return { success: true, data: { ...parsed.data, webapp: webapp as WebappProviders, billing: billing as BillingProviders } };
  },
};
