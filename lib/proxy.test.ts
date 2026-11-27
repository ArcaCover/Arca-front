import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "../proxy";

const request = (authorization?: string) =>
  new NextRequest("https://pilot.arcacover.com/score", { headers: authorization ? { authorization } : {} });

afterEach(() => vi.unstubAllEnvs());

describe("the password of pilot and dev", () => {
  it("lets everything through where SITE_BASIC_AUTH is not set, as in production", () => {
    vi.stubEnv("SITE_BASIC_AUTH", "");
    expect(proxy(request()).status).toBe(200);
  });
  it("asks for the sign-in, and lets the right one through", () => {
    vi.stubEnv("SITE_BASIC_AUTH", "arca:secret");
    const refused = proxy(request());
    expect(refused.status).toBe(401);
    expect(refused.headers.get("WWW-Authenticate")).toContain("Basic");
    expect(proxy(request(`Basic ${btoa("arca:wrong")}`)).status).toBe(401);
    expect(proxy(request(`Basic ${btoa("arca:secret")}`)).status).toBe(200);
  });
});
