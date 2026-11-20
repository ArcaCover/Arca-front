// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { PlanView } from "@arca/contracts";

import SaveResultsCta, { possessive, priceTeaser } from "@/components/app/SaveResultsCta";
import { pollScan } from "@/lib/api/client";
import { rememberSession } from "@/lib/api/session";
import { getPlans } from "@/lib/app/client";
import { fixtureAssessmentResult } from "@/lib/test-fixtures/assessment";
import { fixtureResult } from "@/lib/api/fixture";

// The card that ends the results page and opens the pre-checkout (DN-13 §19): the firm's name from the scan, this result's score,
// tier and steps, the price from the API's plans, and only what the workspace does today.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/app/client");
vi.mock("@/lib/api/client", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api/client")>(), pollScan: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }) }));

const PLANS: PlanView[] = [
  { code: "monthly", name: "Monthly", amountCents: 49_900, currency: "usd", interval: "month" },
  { code: "annual", name: "Annual", amountCents: 499_000, currency: "usd", interval: "year" },
];

function withFirm(firmName: string | null) {
  const result = fixtureResult();
  vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_demo", status: "COMPLETED", cached: false,
    result: { ...result, identity: result.identity ? { ...result.identity, firmName } : null } } as never);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  rememberSession("sc_demo", "synthetic-scan-capability");
  vi.mocked(getPlans).mockResolvedValue(PLANS);
  withFirm("Smith Law");
});
afterEach(() => cleanup());

describe("the price line", () => {
  it("is the cheapest monthly price, and the months the annual plan saves, from the API's plans", () => {
    expect(priceTeaser(PLANS)).toBe("From $499/month · Annual saves two months");
    expect(priceTeaser([{ ...PLANS[0]!, amountCents: 59_900 }, { ...PLANS[1]!, amountCents: 658_900 }])).toBe("From $599/month · Annual saves one month");
    expect(priceTeaser([{ ...PLANS[0]!, amountCents: 49_950 }])).toBe("From $499.50/month");
    // No saving worth a month, or no annual plan: the monthly price alone.
    expect(priceTeaser([PLANS[0]!, { ...PLANS[1]!, amountCents: 598_000 }])).toBe("From $499/month");
    expect(priceTeaser([PLANS[1]!])).toBe("From $4,990/year");
    expect(priceTeaser([])).toBeNull();
  });

  it("writes a firm's possessive as English does", () => {
    expect(possessive("Smith Law")).toBe("Smith Law's");
    expect(possessive("Jones & Rivers")).toBe("Jones & Rivers'");
  });
});

describe("SaveResultsCta", () => {
  it("names the firm the scan found, sums up this result and its steps, and prices from the API", async () => {
    const step = fixtureAssessmentResult().actionPlan[0]!;
    const result = fixtureAssessmentResult({ actionPlan: [step, { ...step, id: "train" }, { ...step, id: "log" }] });
    render(<SaveResultsCta scanId="sc_demo" result={result} />);
    expect(await screen.findByRole("heading", { name: "Keep Smith Law's results and start closing the gaps." })).toBeTruthy();
    const card = screen.getByRole("region", { name: /start closing the gaps/ });
    expect(within(card).getByText("3 next steps in your action plan")).toBeTruthy();
    expect(within(card).getByText(result.tier)).toBeTruthy();
    expect(await within(card).findByText("From $499/month · Annual saves two months")).toBeTruthy();
    expect(within(card).getByText("Secure payment by Stripe · Cancel anytime from Billing")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Activate your account" })).toBeTruthy();
    expect(getPlans).toHaveBeenCalledOnce();
    expect(pollScan).toHaveBeenCalledExactlyOnceWith("sc_demo", "synthetic-scan-capability");
  });

  it("promises only what the workspace does today: no monitoring, no coverage, no insurance price or quote", async () => {
    render(<SaveResultsCta scanId="sc_demo" result={fixtureAssessmentResult()} />);
    const card = await screen.findByRole("region", { name: /start closing the gaps/ });
    for (const title of ["Your analysis, saved", "An action plan to work through", "Your colleagues, with roles", "A record of every change"]) {
      expect(within(card).getByText(title)).toBeTruthy();
    }
    expect(card.textContent).not.toMatch(/monitor|alert|coverage|insur|premium|quote/i);
  });

  it("says \"your firm\" when the scan found no name, and leaves the price out when the plans cannot be read", async () => {
    withFirm(null);
    vi.mocked(getPlans).mockRejectedValue(new Error("offline"));
    render(<SaveResultsCta scanId="sc_demo" result={{ ...fixtureAssessmentResult(), actionPlan: [] }} />);
    expect(await screen.findByRole("heading", { name: "Keep your firm's results and start closing the gaps." })).toBeTruthy();
    expect(screen.queryByText(/next steps? in your action plan/)).toBeNull();
    expect(screen.queryByText(/From \$/)).toBeNull();
  });

  it("says a single step in the singular, and a result with no score as not scored", async () => {
    const base = fixtureAssessmentResult();
    render(<SaveResultsCta scanId="sc_demo" result={{ ...base, compositeScore: null, tier: "UNKNOWN", actionPlan: base.actionPlan.slice(0, 1) }} />);
    expect(await screen.findByText("1 next step in your action plan")).toBeTruthy();
    expect(screen.getByText(/not scored/)).toBeTruthy();
  });
});
