// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnalysisView, MeResponse, OrgView } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import CoveragePage from "@/app/app/coverage/page";
import DocumentsPage from "@/app/app/documents/page";
import HelpPage from "@/app/app/help/page";
import { fixtureResult } from "@/lib/api/fixture";
import { getMe, listAnalyses } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";

const navigation = vi.hoisted(() => ({
  pathname: "/app",
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");

const future = () => new Date(Date.now() + 3_600_000).toISOString();
const PREVIEW_ONLY = "Preview only: this isn't connected yet.";

function org(overrides: Partial<OrgView> = {}): OrgView {
  return {
    id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
    deletionPending: false, paidAccess: true, ...overrides,
  };
}
const UNPAID = { billingStatus: "pending_payment", paidAccess: false } as const;

function me(organizations: OrgView[]): MeResponse {
  return { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
}

function analysis(): AnalysisView {
  return {
    scanId: "sc_demo", domain: "smithlaw.com", scanStatus: "COMPLETED", claimedAt: "2026-10-25T10:00:00.000Z",
    layer1: fixtureResult({ scanId: "sc_demo" }), assessment: null,
  };
}

/** A signed-in user whose /me lists these organizations. */
function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: future() });
  vi.mocked(getMe).mockResolvedValue(me(organizations));
}

/** A page as Next renders it: inside the /app layout, at its own path. */
function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe("/app/coverage", () => {
  it("says there is no active policy and shows limits without any premium", async () => {
    signedIn(org());
    inApp("/app/coverage", <CoveragePage />);
    expect(await screen.findByRole("heading", { name: "No active policy" })).toBeTruthy();
    expect(screen.getByText(/does not have an agreement with an insurance carrier/)).toBeTruthy();
    expect(screen.getByText("AI Work Product Errors")).toBeTruthy();
    expect(screen.getByText("Regulatory Compliance Costs")).toBeTruthy();
    expect(screen.getByText("Coverage names pending validation")).toBeTruthy();
    expect(screen.getByText("$250K")).toBeTruthy();

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/(premium|price|per year|\/yr|annual)[^.]{0,40}\$\s?\d/i);
    expect(text).not.toMatch(/\$\s?\d[\d,.]*\s?[KM]?\s?(\/|per |a )?(year|yr|month|mo)\b/i);
    expect(text).not.toMatch(/Lloyd/);
    expect(screen.getAllByText(/^Sample data/).length).toBeGreaterThanOrEqual(2);
  });

  it("explains that quotes open with a carrier partner", async () => {
    signedIn(org());
    inApp("/app/coverage", <CoveragePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Request a quote" }));
    const dialog = screen.getByRole("dialog", { name: "Request a quote" });
    expect(within(dialog).getByText("Quotes open once ARCA has a carrier partner.")).toBeTruthy();
  });

  it("answers a broker introduction with the preview notice", async () => {
    signedIn(org());
    inApp("/app/coverage", <CoveragePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Connect with a broker" }));
    await userEvent.click(button("Request an introduction"));
    expect(await screen.findByText(PREVIEW_ONLY)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("submits an incident report as a preview and keeps what was typed", async () => {
    signedIn(org());
    inApp("/app/coverage", <CoveragePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Report an incident" }));
    const dialog = screen.getByRole("dialog", { name: "Report an incident" });
    const date = within(dialog).getByLabelText<HTMLInputElement>("When it happened");
    const what = within(dialog).getByLabelText<HTMLTextAreaElement>("What happened");
    const who = within(dialog).getByLabelText<HTMLInputElement>("Who noticed it");
    await userEvent.type(date, "2026-10-20");
    await userEvent.type(what, "A filed brief cited a case that does not exist.");
    await userEvent.type(who, "Opposing counsel");
    await userEvent.click(within(dialog).getByRole("button", { name: "Submit report" }));

    expect(within(dialog).getByText("Preview only. Nothing was sent.")).toBeTruthy();
    expect(date.value).toBe("2026-10-20");
    expect(what.value).toBe("A filed brief cited a case that does not exist.");
    expect(who.value).toBe("Opposing counsel");
  });
});

describe("the paywall on the information pages", () => {
  it.each<[string, () => ReactElement, string]>([
    ["/app/coverage", () => <CoveragePage />, "coverage"],
    ["/app/documents", () => <DocumentsPage />, "documents"],
  ])("locks %s for an organization that has not paid, and asks the API nothing", async (pathname, page, feature) => {
    signedIn(org(UNPAID));
    inApp(pathname, page());
    expect(await screen.findByRole("heading", { name: `Choose a plan to unlock ${feature}` })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See plans" }).getAttribute("href")).toBe("/app/billing");
    expect(listAnalyses).not.toHaveBeenCalled();
  });

  it("leaves help open for an organization that has not paid", async () => {
    signedIn(org(UNPAID));
    inApp("/app/help", <HelpPage />);
    expect(await screen.findByRole("heading", { name: "Frequently asked questions" })).toBeTruthy();
    expect(screen.queryByText(/Choose a plan to unlock/)).toBeNull();
  });
});

describe("/app/documents", () => {
  it("lists the reports of each saved analysis, disabled until they can be generated", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([analysis()]);
    inApp("/app/documents", <DocumentsPage />);
    const reports = await screen.findByRole("list", { name: "Reports" });
    expect(within(reports).getByText("smithlaw.com")).toBeTruthy();
    expect(within(reports).getByRole<HTMLButtonElement>("button", { name: "Quick Scan Report" }).disabled).toBe(true);
    expect(within(reports).getByRole<HTMLButtonElement>("button", { name: "Full Assessment Report" }).disabled).toBe(true);
    expect(within(reports).getByText("Coming soon")).toBeTruthy();
    expect(listAnalyses).toHaveBeenCalledExactlyOnceWith("org_1");
  });

  it("answers a template download with the preview notice", async () => {
    signedIn(org());
    inApp("/app/documents", <DocumentsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Download AI use policy template" }));
    expect(await screen.findByText(PREVIEW_ONLY)).toBeTruthy();
  });

  it("lists a picked evidence file by name and size without reading or uploading it", async () => {
    signedIn(org());
    inApp("/app/documents", <DocumentsPage />);
    const input = await screen.findByLabelText<HTMLInputElement>(/Add evidence files/);
    const file = new File(["confidential"], "ai-policy.pdf", { type: "application/pdf" });
    const read = vi.spyOn(file, "text");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await userEvent.upload(input, file);

    const picked = screen.getByRole("list", { name: "Picked files" });
    expect(within(picked).getByText("ai-policy.pdf")).toBeTruthy();
    expect(within(picked).getByText("12 B")).toBeTruthy();
    expect(screen.getByText("Not uploaded: preview only")).toBeTruthy();
    expect(read).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    await userEvent.click(button("Remove ai-policy.pdf"));
    expect(screen.queryByRole("list", { name: "Picked files" })).toBeNull();
    fetchSpy.mockRestore();
  });
});

describe("/app/help", () => {
  it("opens and closes a question with aria-expanded", async () => {
    signedIn(org());
    inApp("/app/help", <HelpPage />);
    const question = await screen.findByRole("button", { name: "Who sees what in my organization?" });
    expect(question.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(question);
    expect(question.getAttribute("aria-expanded")).toBe("true");
    const answer = document.getElementById(question.getAttribute("aria-controls") ?? "");
    expect(answer?.hidden).toBe(false);
    expect(answer?.textContent).toMatch(/Viewer can see the organization's analyses and pages\./);
    await userEvent.click(question);
    expect(question.getAttribute("aria-expanded")).toBe("false");
  });

  it("links to ARCA by email and Calendly, and answers feedback with the preview notice", async () => {
    signedIn(org());
    inApp("/app/help", <HelpPage />);
    const email = await screen.findByRole("link", { name: "hello@arcacover.com" });
    expect(email.getAttribute("href")).toBe("mailto:hello@arcacover.com");
    const call = screen.getByRole("link", { name: "Book a call with ARCA" });
    expect(call.getAttribute("href")).toBe("https://calendly.com/arcacover/discovery");
    expect(call.getAttribute("target")).toBe("_blank");
    expect(call.getAttribute("rel")).toBe("noreferrer");

    await userEvent.type(screen.getByLabelText("Your feedback"), "The score page is clear.");
    await userEvent.click(button("Send feedback"));
    expect(await screen.findByText(PREVIEW_ONLY)).toBeTruthy();
  });
});
