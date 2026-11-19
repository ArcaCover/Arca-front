// DN-13 §7.6: EnrollRequest and EnrollResponse are new exports of @arca/contracts 0.5.0 (T18), which is not released yet; the
// front keeps installing 0.4.0 from its release tarball and never a `file:` dependency. Until then the two shapes are mirrored
// here with the back's rules (packages/contracts/src/webapp.ts in Arca-back): a request is exactly one of { claimId } or
// { invitationToken }, and the answer is { email } and nothing else. At 0.5.0 this file becomes
//   export { EnrollRequest, EnrollResponse } from "@arca/contracts";
// and nothing that imports it changes.

export type EnrollRequest = { claimId: string } | { invitationToken: string };
export type EnrollResponse = { email: string };

// The contract's z.string().email() is stricter; the API is the one that wrote the address, so a plain shape check is enough
// to tell a mismatched deployment from a real answer.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EnrollResponse = {
  parse(value: unknown): EnrollResponse {
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Not an enroll response");
    const keys = Object.keys(value);
    const { email } = value as { email?: unknown };
    if (keys.length !== 1 || typeof email !== "string" || !EMAIL.test(email)) throw new Error("Not an enroll response");
    return { email };
  },
};
