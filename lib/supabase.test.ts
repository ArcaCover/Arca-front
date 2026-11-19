import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DN-13 §4.3: the browser client of @supabase/ssr, built from the two public variables and nothing else.
const ssr = vi.hoisted(() => ({ createBrowserClient: vi.fn((url: string, key: string) => ({ url, key })) }));
vi.mock("@supabase/ssr", () => ssr);

beforeEach(() => {
  vi.resetModules();
  ssr.createBrowserClient.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabase", () => {
  it("builds the browser client from the URL and the publishable key, once", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabase } = await import("./supabase");

    const client = getSupabase();

    expect(getSupabase()).toBe(client);
    expect(ssr.createBrowserClient).toHaveBeenCalledExactlyOnceWith("http://127.0.0.1:54321", "sb_publishable_test");
  });

  it.each([
    ["the URL", { NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }],
    ["the publishable key", { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined }],
  ])("names both variables when %s is missing, and builds nothing", async (_missing, env) => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    const { getSupabase } = await import("./supabase");

    expect(() => getSupabase()).toThrow(/NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(ssr.createBrowserClient).not.toHaveBeenCalled();
  });

  // The old name of the key is not read any more: a project with only the legacy anon variable is not configured.
  it("does not read the legacy anon key variable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy");
    const { getSupabase } = await import("./supabase");

    expect(() => getSupabase()).toThrow();
  });
});
