// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeResponse, OrgView } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import AppHome from "@/app/app/page";
import ConfirmPage from "@/app/app/auth/confirm/page";
import InvitePage from "@/app/app/invite/[token]/page";
import LoginPage from "@/app/app/login/page";
import SettingsPage from "@/app/app/settings/page";
import SignupPage from "@/app/app/signup/page";
import SaveResultsCta from "@/components/app/SaveResultsCta";
import { ApiError } from "@/lib/api/client";
import { rememberSession } from "@/lib/api/session";
import {
  acceptInvitation, attachAnalysis, createClaim, createOrg, deleteAccount, embeddedCheckout, enroll, getActionPlan, getMe, getPlans,
  listAnalyses, listMembers,
} from "@/lib/app/client";
import { loadAppSession, loadPendingClaim, recallOrg, rememberOrg, saveAppSession, savePendingClaim } from "@/lib/app/session";
import { PROFILE, throughPlan } from "@/lib/test-fixtures/pre-checkout";
import { createFakeSupabase, type FakeSupabase } from "@/lib/test-fixtures/supabase";

// DN-13 T9 and the screen of T11: the webapp's screens on the real accounts (Supabase Auth, a 6-digit code by email), and
// "Delete my account" in every mode. The API is mocked function by function, as in app-flow.test.tsx; the Supabase client is
// the fake of lib/test-fixtures/supabase.ts.

const navigation = vi.hoisted(() => ({
  pathname: "/app",
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
const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => supabase.current }));
// Stripe's embedded Checkout is a stand-in here: pre-checkout.test.tsx checks what it receives.
vi.mock("@/lib/app/stripe", () => ({ stripePromise: () => Promise.resolve(null) }));
vi.mock("@stripe/react-stripe-js", () => ({ EmbeddedCheckoutProvider: () => null, EmbeddedCheckout: () => null }));

let fake: FakeSupabase;
const future = () => new Date(Date.now() + 3_600_000).toISOString();
const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });
const findButton = (name: string | RegExp) => screen.findByRole<HTMLButtonElement>("button", { name });
const NOT_AVAILABLE = "Sign-in is not available yet in this environment.";
const SIMULATION = /Simulated in live-debug/;

function org(overrides: Partial<OrgView> = {}): OrgView {
  return {
    id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
    deletionPending: false, paidAccess: true, ...overrides,
  };
}

function me(email: string, organizations: OrgView[]): MeResponse {
  return { user: { id: `user-${email}`, email }, organizations, platformAdmin: false };
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

/** The real accounts: production with the webapp turned on (DN-13 §7.6 step 4). */
function real() {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");
  vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", "true");
}

/** The six boxes verify on the sixth digit (CodeEntry). */
async function typeCode(code: string) {
  await userEvent.type(await screen.findByLabelText("Digit 1 of 6"), code);
}
const codeGroup = () => screen.queryByRole("group", { name: "Verification code, 6 digits" });
/** The paragraph that says where the code went, whole: the email in it is set in bold. */
const sentNote = (start: RegExp) => screen.findByText(start).then(node => node.textContent);

beforeEach(() => {
  vi.resetAllMocks();
  fake = createFakeSupabase();
  supabase.current = fake;
  localStorage.clear();
  sessionStorage.clear();
  navigation.pathname = "/app";
  navigation.query = "";
  navigation.params = {};
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(getActionPlan).mockResolvedValue({ source: null, items: [] });
  vi.mocked(listMembers).mockResolvedValue({ members: [], invitations: [] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("/app/login with the real accounts", () => {
  beforeEach(() => {
    real();
  });

  it("emails a code to an existing account and signs in with it", async () => {
    fake.acceptCode("ana@smithlaw.com", "123456");
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), " ana@smithlaw.com ");
    await userEvent.click(button("Send my code"));

    expect(fake.auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: "ana@smithlaw.com",
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=%2Fapp` },
    });
    expect(await sentNote(/If an account exists for/)).toContain("If an account exists for ana@smithlaw.com, we sent it a 6-digit code");

    await typeCode("123456");
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app"));
    expect(fake.auth.verifyOtp).toHaveBeenCalledExactlyOnceWith({ email: "ana@smithlaw.com", token: "123456", type: "email" });
  });

  // DN-13 §4.2: an email without an account gets the very same answer, so the login tells no one who is a customer.
  it("says the same when Supabase refuses the email, and still asks for the code", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fake.auth.signInWithOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Signups not allowed for otp", status: 422 } });
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "nobody@smithlaw.com");
    await userEvent.click(button("Send my code"));

    expect(await sentNote(/If an account exists for/)).toContain("If an account exists for nobody@smithlaw.com, we sent it a 6-digit code");
    expect(codeGroup()).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.body.textContent).not.toMatch(/not allowed|no account|could not send/i);

    // A new code, once the cooldown is over, says the same too.
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await userEvent.click(button("Send a new code"));
    expect(await screen.findByText(/If an account exists for nobody@smithlaw.com, we sent it a new code/)).toBeTruthy();
  });

  it("refuses a wrong code and stays on the code", async () => {
    fake.acceptCode("ana@smithlaw.com", "123456");
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "ana@smithlaw.com");
    await userEvent.click(button("Send my code"));
    await typeCode("000000");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "That code is not valid or has expired. Check the latest email, or send a new code.");
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("only takes six digits, one per box", async () => {
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "ana@smithlaw.com");
    await userEvent.click(button("Send my code"));
    const first = await screen.findByLabelText<HTMLInputElement>("Digit 1 of 6");
    expect(first.inputMode).toBe("numeric");
    expect(first.autocomplete).toBe("one-time-code");
    await userEvent.type(first, "12a34 56");
    expect(within(codeGroup()!).getAllByRole<HTMLInputElement>("textbox").map(box => box.value).join("")).toBe("123456");
  });

  it("goes back to the email to try another one", async () => {
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "ana@smithlaw.com");
    await userEvent.click(button("Send my code"));
    await userEvent.click(await findButton("Use a different email"));
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe("ana@smithlaw.com");
    expect(codeGroup()).toBeNull();
  });

  it("has no simulated sign-in, no platform admin box and no simulation line", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    inApp("/app/login", <LoginPage />);
    await screen.findByLabelText("Email");
    expect(screen.queryByLabelText(/platform admin/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(SIMULATION);
    expect(screen.queryByText(NOT_AVAILABLE)).toBeNull();
  });
});

describe("/app/signup with the real accounts", () => {
  // The pre-checkout's steps 1 to 3 (DN-13 §19) are tested in pre-checkout.test.tsx; here, what the real accounts add to it.
  beforeEach(() => {
    real();
    savePendingClaim({ claimId: "cl_1", email: "owner@smithlaw.com", expiresAt: future() });
    vi.mocked(enroll).mockResolvedValue({ email: "owner@smithlaw.com" });
    vi.mocked(getPlans).mockResolvedValue([{ code: "monthly", name: "Monthly", amountCents: 49_900, currency: "usd", interval: "month" }]);
    vi.mocked(createOrg).mockResolvedValue(org({ id: "org_new", billingStatus: "pending_payment", paidAccess: false }));
    vi.mocked(embeddedCheckout).mockResolvedValue({ clientSecret: "cs_test_1_secret_2", sessionId: "cs_test_1" });
    fake.acceptCode("owner@smithlaw.com", "246810");
  });

  it("enrolls the claim's email at step 4, signs in with the code, then creates the organization with its profile", async () => {
    inApp("/app/signup", <SignupPage />);
    expect(await screen.findByText("Save your results and activate your account")).toBeTruthy();
    const email = screen.getByLabelText<HTMLInputElement>("Work email");
    expect(email.value).toBe("owner@smithlaw.com");
    expect(email.readOnly).toBe(true);
    await throughPlan();
    // Nothing is created before the person asks for the code.
    expect(enroll).not.toHaveBeenCalled();

    await userEvent.click(button("Send my code"));
    expect(enroll).toHaveBeenCalledExactlyOnceWith({ claimId: "cl_1" });
    expect(fake.auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: "owner@smithlaw.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=%2Fapp%2Fsignup%3Fclaim%3Dcl_1`,
      },
    });
    expect(await sentNote(/We sent a 6-digit code to/)).toContain("We sent a 6-digit code to owner@smithlaw.com.");
    expect(createOrg).not.toHaveBeenCalled();

    await typeCode("246810");
    await waitFor(() => expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law LLP", "cl_1", PROFILE));
    expect(await screen.findByRole("heading", { level: 2, name: "Payment" })).toBeTruthy();
    expect(recallOrg()).toBe("org_new");
    expect(loadPendingClaim()).toBeNull();
  });

  // DN-13 §17.8 step 2: enroll once per flow; a new code does not need it again.
  it("enrolls once: a code that could not be sent is asked for again without a second enroll", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fake.auth.signInWithOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "Too many requests", status: 429 } });
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(await findButton("Send my code"));
    expect((await screen.findByRole("alert")).textContent).toBe("We could not send the code. Wait a minute and try again.");

    await userEvent.click(button("Send my code"));
    expect(await sentNote(/We sent a 6-digit code to/)).toContain("We sent a 6-digit code to owner@smithlaw.com.");
    expect(enroll).toHaveBeenCalledTimes(1);
    expect(fake.auth.signInWithOtp).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(30_000));
    await userEvent.click(button("Send a new code"));
    expect(await screen.findByText("We sent a new code to owner@smithlaw.com.")).toBeTruthy();
    expect(enroll).toHaveBeenCalledTimes(1);
  });

  it.each<[string, ApiError, string]>([
    ["410", new ApiError("gone", "This link is no longer valid"),
      "This link to save your results has expired or was already used. Run a new scan to save its results."],
    ["429", new ApiError("rate_limited", "Too many requests", 300), "Too many attempts. Try again in 5 minutes."],
    ["503", new ApiError("auth_unavailable", "Sign-in is unavailable"), "Sign-in is temporarily unavailable. Please try again in a moment."],
  ])("explains an enroll refused with %s, and asks for no code", async (_status, error, text) => {
    vi.mocked(enroll).mockRejectedValue(error);
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(await findButton("Send my code"));
    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(loadPendingClaim()?.claimId).toBe("cl_1");
  });

  it("asks no code of someone already signed in with the claim's email", async () => {
    fake.signedInAs("Owner@SmithLaw.com");
    inApp("/app/signup", <SignupPage />);
    expect(await screen.findByText("Save your results to a new organization")).toBeTruthy();
    await throughPlan();
    await userEvent.click(button("Continue to payment"));
    await waitFor(() => expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law LLP", "cl_1", PROFILE));
    expect(enroll).not.toHaveBeenCalled();
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("asks someone signed in with another email for the claim's code", async () => {
    fake.signedInAs("someone@else.com");
    inApp("/app/signup", <SignupPage />);
    expect(await screen.findByText("Save your results and activate your account")).toBeTruthy();
    await throughPlan();
    expect(await findButton("Send my code")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue to payment" })).toBeNull();
  });

  // DN-13 §4.7: the fallback link brings the claim back in the URL, on a tab or a device without the pending claim. The page
  // takes it, drops it from the address bar, and the back checks the session's email against the ticket's.
  it("takes the claim from the URL on another tab, removes it from the address bar and uses the session", async () => {
    sessionStorage.clear();
    navigation.query = "claim=cl_9";
    fake.signedInAs("owner@smithlaw.com");
    inApp("/app/signup", <SignupPage />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/signup"));
    expect((await screen.findByLabelText<HTMLInputElement>("Work email")).value).toBe("owner@smithlaw.com");
    await throughPlan();
    await userEvent.click(button("Continue to payment"));
    await waitFor(() => expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law LLP", "cl_9", PROFILE));
  });

  it("without any claim, sends the visitor to the funnel", async () => {
    sessionStorage.clear();
    inApp("/app/signup", <SignupPage />);
    expect((await screen.findByRole("link", { name: /Start an analysis/ })).getAttribute("href")).toBe("/quote");
    expect(enroll).not.toHaveBeenCalled();
  });

  it("keeps the claim and shows the API's reason when the organization cannot be created", async () => {
    fake.signedInAs("owner@smithlaw.com");
    vi.mocked(createOrg).mockRejectedValue(new ApiError("forbidden", "This claim belongs to another email"));
    inApp("/app/signup", <SignupPage />);
    await throughPlan();
    await userEvent.click(button("Continue to payment"));
    expect((await screen.findByRole("alert")).textContent).toBe("This claim belongs to another email");
    expect(loadPendingClaim()?.claimId).toBe("cl_1");
  });
});

describe("/app/auth/confirm", () => {
  beforeEach(() => {
    real();
    fake.acceptLink("hash_ok", "ana@smithlaw.com");
  });

  // DN-13 §4.1: mail scanners open links; only a person presses a button.
  it("verifies nothing until the button is pressed, then goes to the path the link named", async () => {
    navigation.query = "next=%2Fapp%2Fsignup%3Fclaim%3Dcl_1&token_hash=hash_ok&type=email";
    inApp("/app/auth/confirm", <ConfirmPage />);
    const proceed = await findButton("Continue signing in");
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(fake.auth.verifyOtp).not.toHaveBeenCalled();
    expect(fake.auth.getSession).not.toHaveBeenCalled();

    await userEvent.click(proceed);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/signup?claim=cl_1"));
    expect(fake.auth.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: "hash_ok", type: "email" });
  });

  it.each(["https%3A%2F%2Fevil.example%2Fapp%2F", "%2F%2Fevil.example", "%2Fscore"])("goes to /app instead of next=%s", async next => {
    navigation.query = `next=${next}&token_hash=hash_ok&type=email`;
    inApp("/app/auth/confirm", <ConfirmPage />);
    await userEvent.click(await findButton("Continue signing in"));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app"));
  });

  it("says a used or expired link is no good, and points to the sign-in", async () => {
    navigation.query = "next=%2Fapp&token_hash=hash_used&type=email";
    inApp("/app/auth/confirm", <ConfirmPage />);
    await userEvent.click(await findButton("Continue signing in"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "This link has expired or was already used. Sign in again to get a new code.");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/app/login");
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it.each(["next=%2Fapp&type=email", "next=%2Fapp&token_hash=hash_ok&type=signup"])("offers no button for an incomplete link (%s)", async query => {
    navigation.query = query;
    inApp("/app/auth/confirm", <ConfirmPage />);
    expect(await screen.findByText(/This sign-in link is incomplete/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue signing in" })).toBeNull();
  });

  it("is open without a session", async () => {
    navigation.query = "token_hash=hash_ok&type=email";
    inApp("/app/auth/confirm", <ConfirmPage />);
    await findButton("Continue signing in");
    expect(getMe).not.toHaveBeenCalled();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it.each(["mock", "live-debug"])("is not used by the simulated accounts of %s", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", undefined);
    navigation.query = "token_hash=hash_ok&type=email";
    inApp("/app/auth/confirm", <ConfirmPage />);
    expect(await screen.findByText("Sign-in links are not used in this environment.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue signing in" })).toBeNull();
  });
});

describe("/app/invite/[token] with the real accounts", () => {
  beforeEach(() => {
    real();
    navigation.params = { token: "tok_1" };
    vi.mocked(enroll).mockResolvedValue({ email: "bo@smithlaw.com" });
    vi.mocked(acceptInvitation).mockResolvedValue(org({ id: "org_9", role: "member" }));
    fake.acceptCode("bo@smithlaw.com", "135790");
  });

  it("enrolls the invited email, signs in with the code and accepts", async () => {
    inApp("/app/invite/tok_1", <InvitePage />);
    expect(await screen.findByRole("heading", { level: 1, name: "You're invited." })).toBeTruthy();
    expect(enroll).not.toHaveBeenCalled();

    await userEvent.click(button("Send my code"));
    expect(enroll).toHaveBeenCalledExactlyOnceWith({ invitationToken: "tok_1" });
    expect(fake.auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: "bo@smithlaw.com",
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=%2Fapp%2Finvite%2Ftok_1` },
    });
    expect(await sentNote(/We sent a 6-digit code to/)).toContain("We sent a 6-digit code to bo@smithlaw.com.");
    expect(acceptInvitation).not.toHaveBeenCalled();

    await typeCode("135790");
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app"));
    expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith("tok_1");
    expect(recallOrg()).toBe("org_9");
  });

  it("accepts at once for someone already signed in with the invited email", async () => {
    fake.signedInAs("bo@smithlaw.com");
    inApp("/app/invite/tok_1", <InvitePage />);
    expect(await screen.findByText(/Signed in as bo@smithlaw.com/)).toBeTruthy();
    await userEvent.click(button("Accept invitation"));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app"));
    expect(enroll).toHaveBeenCalledExactlyOnceWith({ invitationToken: "tok_1" });
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("asks someone signed in with another email for the invited email's code", async () => {
    fake.signedInAs("ana@smithlaw.com");
    inApp("/app/invite/tok_1", <InvitePage />);
    await userEvent.click(await findButton("Accept invitation"));
    expect(await sentNote(/We sent a 6-digit code to/)).toContain("We sent a 6-digit code to bo@smithlaw.com.");
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("says an invitation that no longer works is gone", async () => {
    vi.mocked(enroll).mockRejectedValue(new ApiError("gone", "This invitation is no longer valid"));
    inApp("/app/invite/tok_1", <InvitePage />);
    await userEvent.click(await findButton("Send my code"));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This invitation is no longer valid. Ask the person who invited you to send a new one.");
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("shows the API's reason when the acceptance fails", async () => {
    vi.mocked(acceptInvitation).mockRejectedValue(new ApiError("forbidden", "This invitation is for another email"));
    inApp("/app/invite/tok_1", <InvitePage />);
    await userEvent.click(await findButton("Send my code"));
    await typeCode("135790");
    expect((await screen.findByRole("alert")).textContent).toBe("This invitation is for another email");
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });
});

describe("the /app layout with the real accounts", () => {
  beforeEach(() => {
    real();
  });

  it("sends a visitor without a Supabase session to the login, ignoring any simulated one", async () => {
    saveAppSession({ token: "mock-jwt", email: "ana@smithlaw.com", expiresAt: future() });
    inApp("/app", <AppHome />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/login"));
    expect(getMe).not.toHaveBeenCalled();
  });

  it("opens the organization for a Supabase session, and leaves when the session ends", async () => {
    fake.signedInAs("ana@smithlaw.com");
    rememberOrg("org_1");
    vi.mocked(getMe).mockResolvedValue(me("ana@smithlaw.com", [org()]));
    inApp("/app", <AppHome />);
    expect(await screen.findByText("Smith Law")).toBeTruthy();

    fake.endSession();
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/login"));
    expect(recallOrg()).toBeNull();
  });

  it("signs out of Supabase on this browser only", async () => {
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(getMe).mockResolvedValue(me("ana@smithlaw.com", [org()]));
    inApp("/app", <AppHome />);
    await screen.findByText("Smith Law");
    await userEvent.click(screen.getAllByRole("button", { name: "Sign out" })[0]!);
    await waitFor(() => expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" }));
    expect(navigation.router.replace).toHaveBeenCalledWith("/app/login");
    expect(fake.session()).toBeNull();
  });

  it("signs out when the API refuses the token", async () => {
    fake.signedInAs("ana@smithlaw.com");
    vi.mocked(getMe).mockRejectedValue(new ApiError("unauthorized", "Invalid or missing session token"));
    inApp("/app", <AppHome />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/login"));
    await waitFor(() => expect(fake.session()).toBeNull());
  });
});

describe("Delete my account (settings)", () => {
  const dialog = () => screen.getByRole("dialog", { name: "Delete your account?" });

  async function openSettings(role: OrgView["role"] = "owner") {
    vi.mocked(getMe).mockResolvedValue(me("ana@smithlaw.com", [org({ role })]));
    inApp("/app/settings", <SettingsPage />);
    const card = (await screen.findByRole("heading", { name: "Your account" })).closest("section")!;
    expect(within(card).getByText("Signed in as ana@smithlaw.com.")).toBeTruthy();
    await userEvent.click(within(card).getByRole("button", { name: "Delete my account" }));
    return card;
  }

  describe("with the real accounts", () => {
    beforeEach(() => {
      real();
      fake.signedInAs("ana@smithlaw.com");
      rememberOrg("org_1");
    });

    it("asks first, then deletes, signs out of this browser, forgets the organization and the claim, and leaves for the home page", async () => {
      savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: future() });
      vi.mocked(deleteAccount).mockResolvedValue(undefined);
      await openSettings();
      expect(deleteAccount).not.toHaveBeenCalled();
      expect(within(dialog()).getByText(/This cannot be undone/)).toBeTruthy();

      await userEvent.click(within(dialog()).getByRole("button", { name: "Yes, delete my account" }));
      await waitFor(() => expect(navigation.router.replace).toHaveBeenLastCalledWith("/"));
      expect(deleteAccount).toHaveBeenCalledTimes(1);
      expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(fake.session()).toBeNull();
      expect(recallOrg()).toBeNull();
      expect(loadPendingClaim()).toBeNull();
    });

    it("can be called off", async () => {
      await openSettings();
      await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(deleteAccount).not.toHaveBeenCalled();
    });

    // DN-13 §4.8: a sole owner has to hand the organization on, or ask for its deletion, first.
    it("explains the 409 of a sole owner and keeps them signed in", async () => {
      vi.mocked(deleteAccount).mockRejectedValue(new ApiError("conflict", "You are the only owner of an organization"));
      await openSettings();
      await userEvent.click(within(dialog()).getByRole("button", { name: "Yes, delete my account" }));
      expect((await within(dialog()).findByRole("alert")).textContent).toBe(
        "You are the only owner of an organization. Make another member an owner on the Members page, or request the "
        + "organization's deletion, before deleting your account.");
      expect(fake.session()).not.toBeNull();
      expect(recallOrg()).toBe("org_1");
      expect(navigation.router.replace).not.toHaveBeenCalled();
    });

    // DN-13 §17.3: the account is already closed; the same token retries the Auth deletion.
    it("offers to finish after a 503, and the retry signs out", async () => {
      vi.mocked(deleteAccount)
        .mockRejectedValueOnce(new ApiError("auth_unavailable", "Sign-in is unavailable"))
        .mockResolvedValueOnce(undefined);
      await openSettings();
      await userEvent.click(within(dialog()).getByRole("button", { name: "Yes, delete my account" }));
      expect((await within(dialog()).findByRole("alert")).textContent).toBe(
        "Your account is closed, but we could not finish removing your sign-in. Try again to finish.");
      await userEvent.click(within(dialog()).getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(navigation.router.replace).toHaveBeenLastCalledWith("/"));
      expect(deleteAccount).toHaveBeenCalledTimes(2);
      expect(fake.session()).toBeNull();
    });

    it("shows a rate limit as the API says it", async () => {
      vi.mocked(deleteAccount).mockRejectedValue(new ApiError("rate_limited", "Too many requests, try again later", 600));
      await openSettings();
      await userEvent.click(within(dialog()).getByRole("button", { name: "Yes, delete my account" }));
      expect((await within(dialog()).findByRole("alert")).textContent).toBe("Too many requests, try again later");
    });

    // Personal, so every role has it.
    it.each(["admin", "member", "viewer"] as const)("is there for a %s too", async role => {
      await openSettings(role);
      expect(dialog()).toBeTruthy();
    });
  });

  // The simulated accounts of the debug modes close too (DN-13 §17.4): the back's in-memory Auth.
  it.each(["mock", "live-debug"])("works on the simulated accounts of %s", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    saveAppSession({ token: "mock-jwt", email: "ana@smithlaw.com", expiresAt: future() });
    vi.mocked(deleteAccount).mockResolvedValue(undefined);
    await openSettings();
    await userEvent.click(within(dialog()).getByRole("button", { name: "Yes, delete my account" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenLastCalledWith("/"));
    expect(loadAppSession()).toBeNull();
    expect(fake.auth.signOut).not.toHaveBeenCalled();
  });
});

describe("SaveResultsCta with the real accounts", () => {
  beforeEach(() => {
    real();
    rememberSession("sc_demo", "synthetic-scan-capability");
  });

  it("adds the analysis to the paid organization of someone signed in with the claim's email", async () => {
    fake.signedInAs("owner@smithlaw.com");
    vi.mocked(getMe).mockResolvedValue(me("owner@smithlaw.com", [org()]));
    vi.mocked(createClaim).mockResolvedValue({ claimId: "cl_1", email: "owner@smithlaw.com", expiresAt: future() });
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await findButton("Save your results"));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app"));
    expect(attachAnalysis).toHaveBeenCalledExactlyOnceWith("org_1", "cl_1");
  });

  it("takes a visitor without a session to the sign-up, and says nothing of a simulation", async () => {
    vi.mocked(createClaim).mockResolvedValue({ claimId: "cl_1", email: "owner@smithlaw.com", expiresAt: future() });
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await findButton("Activate your account"));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/signup?claim=cl_1"));
    expect(getMe).not.toHaveBeenCalled();
    expect(loadPendingClaim()?.claimId).toBe("cl_1");
    expect(document.body.textContent).not.toMatch(/simulated/i);
  });
});
