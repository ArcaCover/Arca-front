// DN-13 §19: the pre-checkout's shapes come from @arca/contracts 0.5.0 (release tarball). Kept as a module so its importers stay as
// they are.
export {
  ATTORNEY_RANGES,
  CheckoutSessionRequest,
  CreateOrgWithProfileRequest,
  EmbeddedCheckoutResponse,
  ORG_CONTACT_ROLES,
  OrgProfileInput,
} from "@arca/contracts";
export type { AttorneyRange, OrgContactRole } from "@arca/contracts";
