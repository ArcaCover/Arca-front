// DN-13 §7.6, T19: DebugModeResponse with `webapp` and `billing` comes from @arca/contracts 0.5.0 (release tarball). Debug-only:
// only lib/debug and components/debug import it.
import { DebugModeResponse } from "@arca/contracts/debug";

export { DebugModeResponse };
export type WebappProviders = DebugModeResponse["webapp"];
/** Never "live": a live Stripe key stops every debug mode of the back at start (DN-13 §16.1). */
export type BillingProviders = DebugModeResponse["billing"];
