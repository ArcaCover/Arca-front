"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderCheck, History, ListChecks, LockKeyhole, Users } from "lucide-react";
import { can, type AssessmentResult, type OrgView, type PlanView } from "@arca/contracts";

import { activeOrg } from "@/components/app/AppContext";
import SimulationNotice from "@/components/app/SimulationNotice";
import { TierBadge } from "@/components/score";
import { ApiError, pollScan } from "@/lib/api/client";
import { recallSession } from "@/lib/api/session";
import { attachAnalysis, createClaim, getMe, getPlans } from "@/lib/app/client";
import { currentAppSession, savePendingClaim } from "@/lib/app/session";

// An organization the analysis may be added to: the signed-in user's role adds analyses there and it has paid. Any other
// would answer 403 or 402, which leaves the user nowhere, so the claim goes to sign-up instead. Neither a member (DN-11 D2)
// nor a viewer adds analyses, so their results start an organization of their own.
const canAttachTo = (org: OrgView) => can(org.role, "analysis.create") && org.paidAccess;

// The claim is the visitor's email from the scan. Only the person signed in with that same email may add it to their own
// organization (the back refuses another email with 403); sign-up signs in again as the claim's email.
const sameEmail = (a: string | undefined, b: string) => a !== undefined && a.toLowerCase() === b.toLowerCase();

/** "Smith Law's", "Jones & Rivers'": the possessive of a firm's name. */
export const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const dollars = (plan: PlanView) => new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency.toUpperCase(),
  minimumFractionDigits: plan.amountCents % 100 === 0 ? 0 : 2 }).format(plan.amountCents / 100);

/**
 * The price line under the button, from the API's plans and nothing written here: the cheapest monthly price, and how many months
 * the annual plan saves against twelve of them, when it saves at least one. Null without plans.
 */
export function priceTeaser(plans: PlanView[]): string | null {
  const monthly = plans.filter(plan => plan.interval === "month").sort((a, b) => a.amountCents - b.amountCents)[0];
  const annual = plans.filter(plan => plan.interval === "year" && plan.currency === monthly?.currency)
    .sort((a, b) => a.amountCents - b.amountCents)[0];
  if (!monthly) {
    const cheapest = [...plans].sort((a, b) => a.amountCents - b.amountCents)[0];
    return cheapest ? `From ${dollars(cheapest)}/${cheapest.interval}` : null;
  }
  const saved = annual ? Math.round((monthly.amountCents * 12 - annual.amountCents) / monthly.amountCents) : 0;
  const months = saved >= 1 && saved <= 11 ? ` · Annual saves ${WORDS[saved]} ${saved === 1 ? "month" : "months"}` : "";
  return `From ${dollars(monthly)}/month${months}`;
}

// What the workspace does today, and only that (CLAUDE.md §7): the analyses, the action plan with owners and dates, the activity
// log and the members with their roles. The monitoring alerts are still sample data, so they are not offered here.
const VALUE = [
  { icon: FolderCheck, title: "Your analysis, saved", text: "This score and its evidence stay with the firm, past this tab's 24 hours." },
  { icon: ListChecks, title: "An action plan to work through", text: "Each next step with an owner, a due date and its status." },
  { icon: Users, title: "Your colleagues, with roles", text: "Invite partners and staff as admins, members or viewers." },
  { icon: History, title: "A record of every change", text: "Who did what, in an activity log owners and admins can read." },
] as const;

// The end of the anonymous funnel (DN-10 §3), and the way into the pre-checkout (DN-13 §19). The scan token is traded for a
// one-use claim ticket: a visitor without an organization takes it to sign-up, and a signed-in customer adds the analysis to
// the organization they already have.
export default function SaveResultsCta({ scanId, result }: { scanId: string; result?: AssessmentResult }) {
  const router = useRouter();
  // The organization the user is in, and only that one (DN-10 §4.7): undefined while /me is asked, null with none.
  const [active, setActive] = useState<OrgView | null | undefined>(undefined);
  // null when the analysis is going to a new organization through sign-up.
  const target = active && canAttachTo(active) ? active : active === undefined ? undefined : null;
  const [firm, setFirm] = useState<string | null>(null);
  const [teaser, setTeaser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // With the real accounts the session is the Supabase client's (DN-13 §4.3), so it is read asynchronously.
    const lookup = currentAppSession().then(session => (session ? getMe().then(me => activeOrg(me.organizations)) : null));
    // A /me that fails leaves the sign-up path, which still works: the results are never blocked by it.
    lookup
      .catch(() => null)
      .then(org => {
        if (!cancelled) setActive(org);
      });
    // The firm's name, as the scan found it, and the plans' prices: both only dress the card, so a failure leaves it plain.
    const token = recallSession(scanId);
    if (token) {
      Promise.resolve()
        .then(() => pollScan(scanId, token))
        .then(poll => {
          if (!cancelled && poll && "result" in poll) setFirm(poll.result.identity?.firmName ?? null);
        })
        .catch(() => undefined);
    }
    Promise.resolve()
      .then(() => getPlans())
      .then(plans => {
        if (!cancelled && Array.isArray(plans)) setTeaser(priceTeaser(plans));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  async function save() {
    const token = recallSession(scanId);
    if (!token) {
      setError("This tab no longer has access to this scan. Run a new scan to save its results.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const claim = await createClaim(token);
      if (target && sameEmail((await currentAppSession())?.email, claim.email)) {
        await attachAnalysis(target.id, claim.claimId);
        router.push("/app");
      } else {
        savePendingClaim(claim);
        router.push(`/app/signup?claim=${encodeURIComponent(claim.claimId)}`);
      }
    } catch (cause) {
      // The organization stopped being paid since /me was read: billing is where the owner can fix that (DN-10 §4.5).
      if (cause instanceof ApiError && cause.code === "payment_required") {
        router.push("/app/billing");
        return;
      }
      setError(cause instanceof ApiError ? cause.message : "We could not save your results. Please try again.");
      setBusy(false);
    }
  }

  const steps = result?.actionPlan.length ?? 0;
  const label = target === null
    ? active ? "Save your results to a new organization" : "Activate your account"
    : "Save your results";
  return (
    <section aria-labelledby="save-results-title"
      className="@container mt-7 overflow-hidden rounded-[28px] bg-marino p-6 text-white shadow-[0_24px_60px_-34px_color-mix(in_srgb,var(--color-marino)_70%,transparent)] sm:p-8">
      {/* The card sits in the results' right column: its layout follows its own width, not the window's. */}
      <div className="grid gap-8 @4xl:grid-cols-[1.2fr_0.8fr] @4xl:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cielo">Keep these results</p>
          <h2 id="save-results-title" className="mt-3 font-heading text-[26px] font-medium leading-[1.15] tracking-[-0.03em] sm:text-[32px]">
            Keep {firm ? possessive(firm) : "your firm's"} results and start closing the gaps.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
            {target
              ? `If this scan was made with your email, it joins the analyses of ${target.name}; otherwise you create an organization for it.`
              : active && !can(active.role, "analysis.create")
                ? `Your role in ${active.name} does not add analyses. Create an organization to keep this one and invite your colleagues.`
                : "Your ARCA workspace in five short steps. Nothing is charged before the last one."}
          </p>

          {result && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 pr-4 text-marino sm:inline-flex">
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {result.compositeScore === null ? "–" : Math.round(result.compositeScore)}
                <span className="text-sm font-normal text-marino/60">{result.compositeScore === null ? " not scored" : " / 100"}</span>
              </span>
              <TierBadge tier={result.tier} />
              {steps > 0 && (
                <span className="text-sm font-semibold">
                  {steps} next {steps === 1 ? "step" : "steps"} in your action plan
                </span>
              )}
            </div>
          )}

          <ul className="mt-6 grid gap-4 @md:grid-cols-2">
            {VALUE.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white/10 text-cielo">
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                <span className="text-sm leading-6">
                  <strong className="block font-semibold text-white">{title}</strong>
                  <span className="text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={save}
              disabled={busy || target === undefined}
              className="group inline-flex items-center gap-3 rounded-full bg-oro py-2 pl-6 pr-2 font-heading text-base font-medium text-marino transition-transform motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cielo disabled:opacity-60"
            >
              {/* Which path a signed-in customer takes depends on the claim's email, unknown until the claim exists. Someone
                  signed in already has an account, so on the sign-up path they only start a new organization. */}
              {label}
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">
                <ArrowRight aria-hidden className="h-4 w-4" />
              </span>
            </button>
            {/* The line keeps its height before the plans arrive, so nothing below moves. */}
            <p className="min-h-5 text-sm font-semibold text-white/85">{teaser}</p>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-white/65">
            <LockKeyhole aria-hidden className="h-3.5 w-3.5 shrink-0" />
            Secure payment by Stripe · Cancel anytime from Billing
          </p>
          <SimulationNotice />
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-rojo">
              {error}
            </p>
          )}
        </div>

        {/* A glimpse of the workspace, built from this result: decoration for a wide card, said in words above. */}
        <div aria-hidden className="hidden min-w-0 rounded-3xl bg-white p-5 text-marino shadow-xl @lg:block">
          <div className="flex items-center justify-between">
            <span className="font-heading text-sm font-semibold">{firm ?? "Your firm"}</span>
            <span className="rounded-full bg-bruma px-2.5 py-0.5 text-[11px] font-semibold">Owner</span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-marino/55">Action plan</p>
          <div className="mt-2 h-1.5 rounded-full bg-marino/10">
            <div className="h-1.5 w-[6%] rounded-full bg-cielo" />
          </div>
          <ul className="mt-4 space-y-2.5">
            {(result?.actionPlan.slice(0, 3) ?? []).map(item => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-marino/10 px-3 py-2 text-xs">
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 rounded-full bg-marino/5 px-2 py-0.5 font-semibold text-marino/70">To do</span>
              </li>
            ))}
            {(!result || result.actionPlan.length === 0) && (
              <li className="rounded-xl border border-dashed border-marino/15 px-3 py-2 text-xs text-marino/60">Your next steps</li>
            )}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-xs text-marino/60">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-marino text-[10px] font-semibold text-white">+</span>
            Invite a colleague
          </div>
        </div>
      </div>
    </section>
  );
}
