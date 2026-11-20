// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeResponse, OrgView, PlanView } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import BillingPage from "@/app/app/billing/page";
import BillingReturnPage from "@/app/app/billing/return/page";
import SignupPage from "@/app/app/signup/page";
import { ApiError } from "@/lib/api/client";
import { signIn } from "@/lib/app/auth";
import { checkout, createOrg, embeddedCheckout, enroll, getMe, getOrg, getPlans, syncBilling } from "@/lib/app/client";
import { loadPendingClaim, recallOrg, saveAppSession, savePendingClaim } from "@/lib/app/session";
import { stripePromise } from "@/lib/app/stripe";
import { PROFILE, choosePlan, fillFirm, fillYou, throughPlan } from "@/lib/test-fixtures/pre-checkout";
import { createFakeSupabase, type FakeSupabase } from "@/lib/test-fixtures/supabase";

// DN-13 §19: the pre-checkout. Five steps (you, your firm, plan, verify email, payment) on /app/signup; the payment is Stripe's
// Checkout embedded in the page with the real accounts, and the simulated checkout in the debug modes. /app/billing resumes an
// abandoned payment the same way, and /app/billing/return syncs it. Stripe's React components are stand-ins: what they receive is
// what is checked.

const navigation = vi.hoisted(() => ({
  pathname: "/app/signup",
  query: "",
  params: {} as Record<string, string>,
  router: { replace: vi.fn(), push: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.query),
  useParams: () => navigation.params,
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");
vi.mock("@/lib/app/auth", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/app/auth")>(), signIn: vi.fn() }));
const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => supabase.current }));
vi.mock("@/lib/app/stripe", () => ({ stripePromise: vi.fn() }));
const stripeUi = vi.hoisted(() => ({ providers: [] as Array<{ stripe: unknown; options: Record<string, unknown> }> }));
vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ stripe, options, children }: { stripe: unknown; options: Record<string, unknown>; children: ReactNode }) => {
    stripeUi.providers.push({ stripe, options });
    return <div data-testid="stripe-provider">{children}</div>;
  },
  EmbeddedCheckout: () => <div role="region" aria-label="Stripe Checkout">Stripe Checkout</div>,
}));

let fake: FakeSupabase;
const STRIPE = { stripe: "instance" };
const future = () => new Date(Date.now() + 3_600_000).toISOString();
const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });
const findButton = (name: string | RegExp) => screen.findByRole<HTMLButtonElement>("button", { name });
const SECRET = "cs_test_a1_secret_b2";
const PLANS: PlanView[] = [
  { code: "monthly", name: "Monthly", amountCents: 49_900, currency: "usd", interval: "month" },
  { code: "annual", name: "Annual", amountCents: 499_000, currency: "usd", interval: "year" },
];

function org(overrides: Partial<OrgView> = {}): OrgView {
  return { id: "org_new", name: "Smith Law LLP", domain: "smithlaw.com", billingStatus: "pending_payment", role: "owner", deletionPending: false,
    paidAccess: false, ...overrides };
}
function me(email: string, organizations: OrgView[]): MeResponse {
  return { user: { id: `user-${email}`, email }, organizations, platformAdmin: false };
}
function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}
function real() {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");
  vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", "true");
}
const stepNow = () => screen.getByRole("listitem", { current: "step" }).textContent;
/** The six boxes verify on the sixth digit (CodeEntry). */
async function typeCode(code: string) {
  await userEvent.type(await screen.findByLabelText("Digit 1 of 6"), code);
}

beforeEach(() => {
  vi.resetAllMocks();
  fake = createFakeSupabase();
  supabase.current = fake;
  stripeUi.providers.length = 0;
  localStorage.clear();
  sessionStorage.clear();
  navigation.pathname = "/app/signup";
  navigation.query = "";
  navigation.params = {};
  savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: future() });
  vi.mocked(getPlans).mockResolvedValue(PLANS);
  vi.mocked(enroll).mockResolvedValue({ email: "ana@smithlaw.com" });
  vi.mocked(createOrg).mockResolvedValue(org());
  vi.mocked(embeddedCheckout).mockResolvedValue({ clientSecret: SECRET, sessionId: "cs_test_a1" });
  vi.mocked(stripePromise).mockReturnValue(Promise.resolve(STRIPE) as never);
  vi.mocked(signIn).mockImplementation(async email => {
    saveAppSession({ token: "app-token", email, expiresAt: future() });
    return "signed_in";
  });
  fake.acceptCode("ana@smithlaw.com", "246810");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("the pre-checkout, steps 1 to 3", () => {
  beforeEach(() => real());

  it("shows the five steps, the claim's email locked, and moves on only with a name and a role", async () => {
    inApp("/app/signup", <SignupPage />);
    const steps = await screen.findByRole("list", { name: "Steps" });
    expect(within(steps).getAllByRole("listitem").map(item => item.textContent)).toEqual([
      expect.stringContaining("You"), expect.stringContaining("Your firm"), expect.stringContaining("Plan"),
      expect.stringContaining("Verify email"), expect.stringContaining("Payment")]);
    expect(stepNow()).toContain("You");
    const email = screen.getByLabelText<HTMLInputElement>("Work email");
    expect(email.value).toBe("ana@smithlaw.com");
    expect(email.readOnly).toBe(true);

    await userEvent.click(button("Continue"));
    const name = screen.getByLabelText("Full name");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(name.getAttribute("aria-describedby")!.split(" ")[0]!)?.textContent).toBe("Enter your full name.");
    expect(screen.getByText("Choose your role.")).toBeTruthy();
    // The first field to fix gets the focus.
    expect(document.activeElement).toBe(name);
    expect(stepNow()).toContain("You");

    await userEvent.type(name, "Ana Smith");
    await userEvent.click(screen.getByRole("radio", { name: "Partner" }));
    await userEvent.type(screen.getByLabelText(/^Phone/), "555-0100");
    await userEvent.click(button("Continue"));
    expect(screen.getByText("Enter a phone number with 10 to 15 digits, or leave it empty.")).toBeTruthy();
    await userEvent.clear(screen.getByLabelText(/^Phone/));
    await userEvent.click(button("Continue"));
    expect(await screen.findByLabelText("Firm legal name")).toBeTruthy();
    expect(stepNow()).toContain("Your firm");
    expect(enroll).not.toHaveBeenCalled();
  });

  it("checks the firm, field by field, and keeps what was typed when going back", async () => {
    inApp("/app/signup", <SignupPage />);
    await fillYou();
    await userEvent.click(button("Continue"));
    for (const text of ["Enter the firm's legal name.", "Enter the street address.", "Enter the city.", "Choose the state.",
      "Enter a 5-digit ZIP code, or ZIP+4.", "Choose how many attorneys work at the firm.", "Choose at least one state where the firm practices."]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(document.activeElement).toBe(screen.getByLabelText("Firm legal name"));
    await userEvent.type(screen.getByLabelText(/^EIN/), "12-34");
    await userEvent.click(button("Continue"));
    expect(screen.getByText("An EIN has 9 digits, like 12-3456789. You can leave it empty.")).toBeTruthy();

    await userEvent.click(button("Back"));
    expect(screen.getByLabelText<HTMLInputElement>("Full name").value).toBe("Ana Smith");
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Managing partner" }).checked).toBe(true);
    await userEvent.click(button("Continue"));
    expect(screen.getByLabelText<HTMLInputElement>(/^EIN/).value).toBe("12-34");
  });

  it("finds a practice state by name, and says which ones are chosen", async () => {
    inApp("/app/signup", <SignupPage />);
    await fillYou();
    await userEvent.type(await screen.findByLabelText("Find a state"), "new");
    const states = screen.getByRole("group", { name: "States where the firm practices" });
    expect(within(states).getAllByRole("checkbox").map(box => box.getAttribute("aria-label") ?? box.closest("label")?.textContent))
      .toEqual(["New Hampshire", "New Jersey", "New Mexico", "New York"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "New York" }));
    expect(screen.getByText("1 selected: New York")).toBeTruthy();
  });

  it("lists the API's plans, with what the firm gets, and asks for one", async () => {
    inApp("/app/signup", <SignupPage />);
    await fillYou();
    await fillFirm();
    expect(await screen.findByRole("radio", { name: /Monthly.*\$499\.00 \/ month/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Annual.*\$4,990\.00 \/ year/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What Smith Law LLP gets" })).toBeTruthy();
    expect(screen.getByText(/Billed in US dollars/)).toBeTruthy();
    await userEvent.click(button("Continue"));
    expect(screen.getByText("Choose a plan.")).toBeTruthy();
    await choosePlan(/Annual/);
    expect(stepNow()).toContain("Verify email");
  });

  it("keeps the draft through a reload of the tab, and only in this tab", async () => {
    const first = inApp("/app/signup", <SignupPage />);
    await fillYou();
    await userEvent.type(await screen.findByLabelText("Firm legal name"), "Smith Law LLP");
    first.unmount();
    inApp("/app/signup", <SignupPage />);
    expect(await screen.findByLabelText<HTMLInputElement>("Firm legal name")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Firm legal name").value).toBe("Smith Law LLP");
    expect(localStorage.length).toBe(0);
  });
});

describe("the pre-checkout with the real accounts, steps 4 and 5", () => {
  beforeEach(() => real());

  it("creates nothing before the code: enroll, code, then POST /orgs with the profile, then Checkout embedded with its client secret", async () => {
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    // Step 4 shows who the code goes to, as a chip, and why.
    expect(screen.getByText("ana@smithlaw.com", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("From your scan")).toBeTruthy();
    expect(screen.getByText(/to verify it's you — no password/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("One step from your results.");
    expect(enroll).not.toHaveBeenCalled();
    expect(createOrg).not.toHaveBeenCalled();

    await userEvent.click(button("Send my code"));
    expect(enroll).toHaveBeenCalledExactlyOnceWith({ claimId: "cl_1" });
    expect(fake.auth.signInWithOtp).toHaveBeenCalledOnce();
    expect(createOrg).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Check your inbox.");
    expect(stepNow()).toContain("Verify email");
    await typeCode("246810");

    await waitFor(() => expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law LLP", "cl_1", PROFILE));
    expect(await screen.findByRole("region", { name: "Stripe Checkout" })).toBeTruthy();
    expect(stepNow()).toContain("Payment");
    expect(embeddedCheckout).toHaveBeenCalledExactlyOnceWith("org_new", "monthly");
    expect(stripePromise).toHaveBeenCalled();
    expect(stripeUi.providers.at(-1)).toEqual({ stripe: expect.anything(), options: { clientSecret: SECRET } });
    expect(await stripeUi.providers.at(-1)!.stripe).toBe(STRIPE);
    expect(recallOrg()).toBe("org_new");
    expect(loadPendingClaim()).toBeNull();
    // The draft is gone once the account holds it.
    expect(Object.keys(sessionStorage).filter(key => key.startsWith("arca.precheckout"))).toEqual([]);
    expect(screen.getByText(/finish later from Billing/)).toBeTruthy();
  });

  it("enrolls once, explains a refused enroll, and keeps the claim", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(enroll).mockRejectedValueOnce(new ApiError("rate_limited", "Too many requests", 300));
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(button("Send my code"));
    expect((await screen.findByRole("alert")).textContent).toBe("Too many attempts. Try again in 5 minutes.");
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
    await userEvent.click(button("Send my code"));
    expect(await screen.findByLabelText("Digit 1 of 6")).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await userEvent.click(button("Send a new code"));
    expect(enroll).toHaveBeenCalledTimes(2);
    expect(loadPendingClaim()?.claimId).toBe("cl_1");
  });

  it("asks no code of someone already signed in with the claim's email", async () => {
    fake.signedInAs("Ana@SmithLaw.com");
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    expect(screen.getByText(/signed in as/i).textContent).toMatch(/signed in as Ana@SmithLaw.com/i);
    await userEvent.click(button("Continue to payment"));
    await waitFor(() => expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law LLP", "cl_1", PROFILE));
    expect(enroll).not.toHaveBeenCalled();
    expect(await screen.findByRole("region", { name: "Stripe Checkout" })).toBeTruthy();
  });

  it("keeps the claim and stays on step 4 when the organization cannot be created", async () => {
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(createOrg).mockRejectedValue(new ApiError("conflict", "This analysis already belongs to an organization"));
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(button("Continue to payment"));
    expect((await screen.findByRole("alert")).textContent).toBe("This analysis already belongs to an organization");
    expect(stepNow()).toContain("Verify email");
    expect(loadPendingClaim()?.claimId).toBe("cl_1");
    expect(embeddedCheckout).not.toHaveBeenCalled();
  });

  it("offers to try again when the payment cannot open, and says so when the firm already pays", async () => {
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(embeddedCheckout).mockRejectedValueOnce(new ApiError("billing_unavailable", "Payments are unavailable right now; try again in a minute"));
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(button("Continue to payment"));
    expect((await screen.findByRole("alert")).textContent).toBe("Payments are unavailable right now; try again in a minute");
    expect(screen.queryByRole("region", { name: "Stripe Checkout" })).toBeNull();
    await userEvent.click(button("Try again"));
    expect(await screen.findByRole("region", { name: "Stripe Checkout" })).toBeTruthy();
    expect(embeddedCheckout).toHaveBeenCalledTimes(2);
  });

  it("without Stripe's publishable key, says the payment cannot open here", async () => {
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(stripePromise).mockReturnValue(null);
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(button("Continue to payment"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Payments are not available/);
    expect(screen.queryByRole("region", { name: "Stripe Checkout" })).toBeNull();
  });
});

describe.each(["mock", "live-debug"])("the pre-checkout with the simulated accounts (%s)", mode => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    // The simulated checkout is another page; a same-origin URL lets jsdom follow it.
    vi.mocked(checkout).mockResolvedValue({ url: `${window.location.origin}/#mock-checkout` });
  });

  it("shows the same four steps, then pays through the simulated checkout without loading Stripe", async () => {
    try {
      inApp("/app/signup", <SignupPage />);
      await throughPlan(/Annual/);
      expect(stepNow()).toContain("Verify email");
      await userEvent.click(button("Create my account"));
      await waitFor(() => expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law LLP", "cl_1", PROFILE));
      expect(signIn).toHaveBeenCalledExactlyOnceWith("ana@smithlaw.com");
      expect(stepNow()).toContain("Payment");
      await userEvent.click(await findButton("Continue to payment"));
      expect(checkout).toHaveBeenCalledExactlyOnceWith("org_new", "annual");
      await waitFor(() => expect(window.location.hash).toBe("#mock-checkout"));
      expect(stripePromise).not.toHaveBeenCalled();
      expect(embeddedCheckout).not.toHaveBeenCalled();
      expect(stripeUi.providers).toEqual([]);
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});

describe.each([undefined, "production"])("the pre-checkout in production without the webapp (mode %s)", mode => {
  beforeEach(async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    const actual = await vi.importActual<typeof import("@/lib/app/auth")>("@/lib/app/auth");
    vi.mocked(signIn).mockImplementation(actual.signIn);
  });

  it("says sign-in is not available at step 4 and creates nothing", async () => {
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(button("Create my account"));
    expect(await screen.findByText("Sign-in is not available yet in this environment.")).toBeTruthy();
    expect(createOrg).not.toHaveBeenCalled();
  });
});

describe("/app/billing resumes an abandoned payment", () => {
  function signedIn(organization: OrgView) {
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(getMe).mockResolvedValue(me("ana@smithlaw.com", [organization]));
  }

  it("embeds Checkout for the plan the owner picks, in the page, with the real accounts", async () => {
    real();
    signedIn(org());
    inApp("/app/billing", <BillingPage />);
    await userEvent.click(await findButton("Pay with Annual"));
    expect(await screen.findByRole("region", { name: "Stripe Checkout" })).toBeTruthy();
    expect(embeddedCheckout).toHaveBeenCalledExactlyOnceWith("org_new", "annual");
    expect(stripeUi.providers.at(-1)!.options).toEqual({ clientSecret: SECRET });
    expect(window.location.hash).toBe("");
    expect(checkout).not.toHaveBeenCalled();
    // Another plan: the payment is opened again for it.
    await userEvent.click(button("Choose another plan"));
    await userEvent.click(await findButton("Pay with Monthly"));
    await waitFor(() => expect(embeddedCheckout).toHaveBeenLastCalledWith("org_new", "monthly"));
  });

  it("keeps the simulated checkout of the debug modes, with no Stripe", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt: future() });
    vi.mocked(getMe).mockResolvedValue(me("ana@smithlaw.com", [org()]));
    vi.mocked(checkout).mockResolvedValue({ url: `${window.location.origin}/#mock-checkout` });
    try {
      inApp("/app/billing", <BillingPage />);
      await userEvent.click(await findButton("Pay with Monthly"));
      await waitFor(() => expect(window.location.hash).toBe("#mock-checkout"));
      expect(stripePromise).not.toHaveBeenCalled();
      expect(embeddedCheckout).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});

describe("/app/billing/return", () => {
  beforeEach(() => {
    real();
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(getMe).mockResolvedValue(me("ana@smithlaw.com", [org()]));
  });

  it("syncs the session Stripe sent back and goes into the app once it is paid", async () => {
    navigation.query = "session_id=cs_test_a1";
    vi.mocked(syncBilling).mockResolvedValue(org({ billingStatus: "active", paidAccess: true }));
    inApp("/app/billing/return", <BillingReturnPage />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app?paid=1"));
    expect(syncBilling).toHaveBeenCalledExactlyOnceWith("org_new", "cs_test_a1");
  });

  it("waits for the webhook when the sync finds it not paid yet, then goes in", async () => {
    navigation.query = "session_id=cs_test_a1";
    vi.mocked(syncBilling).mockResolvedValue(org());
    vi.mocked(getOrg).mockResolvedValueOnce(org()).mockResolvedValue(org({ billingStatus: "active", paidAccess: true }));
    inApp("/app/billing/return", <BillingReturnPage />);
    expect(await screen.findByText(/Confirming your payment/)).toBeTruthy();
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app?paid=1"), { timeout: 8000 });
    expect(getOrg).toHaveBeenCalledWith("org_new");
  });

  it("says the payment is still being confirmed after the wait, and checks again on request", async () => {
    navigation.query = "session_id=cs_test_a1";
    vi.mocked(syncBilling).mockResolvedValue(org());
    vi.mocked(getOrg).mockResolvedValue(org());
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      inApp("/app/billing/return", <BillingReturnPage />);
      await screen.findByText(/Confirming your payment/);
      await vi.advanceTimersByTimeAsync(31_000);
      expect(await screen.findByText(/Your payment is being confirmed/)).toBeTruthy();
      vi.mocked(getOrg).mockResolvedValue(org({ billingStatus: "active", paidAccess: true }));
      await userEvent.click(button("Check again"));
      await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app?paid=1"));
    } finally {
      vi.useRealTimers();
    }
  });

  it.each<[string, string, () => void, RegExp]>([
    ["no session", "", () => undefined, /no payment to confirm/i],
    ["a malformed session", "session_id=../../admin", () => undefined, /no payment to confirm/i],
    ["a session of another organization", "session_id=cs_test_zz", () => vi.mocked(syncBilling).mockRejectedValue(
      new ApiError("not_found", "Checkout session not found")), /could not find this payment/i],
  ])("explains %s and points back to billing", async (_why, query, arrange, text) => {
    navigation.query = query;
    arrange();
    inApp("/app/billing/return", <BillingReturnPage />);
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Billing" }).getAttribute("href")).toBe("/app/billing");
    expect(navigation.router.replace).not.toHaveBeenCalledWith("/app?paid=1");
  });
});
