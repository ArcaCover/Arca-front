import { describe, expect, it } from "vitest";

import { tokenTimes } from "./token";

const ISSUED = 1_792_800_000;
const segment = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
// The shape the API issues (apps/api/src/auth/session-token.ts): the email is a claim of its own.
const HEADER = segment({ alg: "HS256" });
const TOKEN = [
  HEADER,
  segment({
    email: "partner@firm.example",
    sub: "scan-1",
    iss: "arca-api",
    aud: "arca-scan",
    iat: ISSUED,
    exp: ISSUED + 86_400,
  }),
  "c2lnbmF0dXJl",
].join(".");

describe("tokenTimes", () => {
  it("returns only when the token was issued and when it expires", () => {
    const times = tokenTimes(TOKEN);

    expect(times).toEqual({ issuedAt: "2026-10-24T00:00:00.000Z", expiresAt: "2026-10-25T00:00:00.000Z" });
    expect(Object.keys(times ?? {})).toEqual(["issuedAt", "expiresAt"]);
    expect(JSON.stringify(times)).not.toContain("@");
  });

  it("returns null for anything that is not a token with both times", () => {
    expect(tokenTimes("garbage")).toBeNull();
    expect(tokenTimes(`${HEADER}.not-base64-json.sig`)).toBeNull();
    expect(tokenTimes(`${HEADER}.${segment({ email: "partner@firm.example", iat: ISSUED })}.sig`)).toBeNull();
  });
});
