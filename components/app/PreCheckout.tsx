"use client";

import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import type { OrgView, PlanView } from "@arca/contracts";

import { SIGN_IN_NOT_AVAILABLE } from "@/components/app/AppContext";
import CodeEntry from "@/components/app/CodeEntry";
import EmbeddedPayment from "@/components/app/EmbeddedPayment";
import FunnelFrame, { FunnelCard, IdentityChip } from "@/components/app/FunnelFrame";
import { buttonClass, inputClass } from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { requestCode, signIn } from "@/lib/app/auth";
import { ATTORNEY_RANGES, ORG_CONTACT_ROLES } from "@/lib/app/checkout-contract";
import { checkout, createOrg, enroll, getPlans } from "@/lib/app/client";
import { CODE_NOT_SENT, enrollFailure } from "@/lib/app/enroll-failure";
import {
  ATTORNEY_RANGE_LABEL, CONTACT_ROLE_LABEL, EMPTY_DRAFT, clearDraft, loadDraft, profileOf, saveDraft, validateFirm, validateYou,
  type DraftField, type FieldErrors, type ProfileDraft,
} from "@/lib/app/pre-checkout";
import { formatPrice } from "@/lib/app/price";
import { clearPendingClaim, rememberOrg } from "@/lib/app/session";
import { US_STATES, stateName, type UsStateCode } from "@/lib/app/us-states";

const STEPS = ["You", "Your firm", "Plan", "Verify email", "Payment"] as const;
type Step = 1 | 2 | 3 | 4 | 5;
const YOU_FIELDS: DraftField[] = ["contactName", "contactRole", "phone"];
const FIRM_FIELDS: DraftField[] = ["legalName", "ein", "line1", "city", "state", "postalCode", "attorneyRange", "practiceStates"];
const fieldId = (field: DraftField) => `pc-${field}`;

/**
 * The pre-checkout (DN-13 §19), at /app/signup: who you are, your firm, the plan, the emailed code that creates the account, and the
 * payment. Nothing is written before the code: the first three steps stay in this tab. With the code, POST /orgs creates the
 * organization with the firm's profile, and the payment opens with it already on Stripe's side. `real` is the real accounts
 * (Supabase's code, Stripe embedded); otherwise the simulated sign-in and checkout of the debug modes, with the same four steps.
 */
export default function PreCheckout({ claimId, email, signedInAs, real, notice, eyebrow }: {
  claimId: string;
  /** Over the headline: what the whole flow does for this person. */
  eyebrow: string;
  /** The claim's email, locked; null only for a claim from a link whose email the enroll tells. */
  email: string | null;
  /** The session's email when it is already the claim's: no code to ask for. */
  signedInAs: string | null;
  real: boolean;
  /** The live-debug line about the simulation, under the title. */
  notice?: ReactNode;
}) {
  const [saved] = useState(() => loadDraft(claimId));
  const [step, setStep] = useState<Step>(saved?.step ?? 1);
  const [draft, setDraft] = useState<ProfileDraft>(saved?.draft ?? EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(saved?.planCode ?? null);
  const [org, setOrg] = useState<OrgView | null>(null);
  // Step 4 once the code is on its way: the headline sends the person to their inbox.
  const [inbox, setInbox] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);

  // Three steps of typing survive a reload of the tab; the account holds them from step 4 on.
  useEffect(() => {
    if (step <= 3) saveDraft(claimId, { draft, planCode, step: step as 1 | 2 | 3 });
  }, [claimId, draft, planCode, step]);

  // A new step is announced by moving the focus to its title, never on the first render.
  useEffect(() => {
    if (shownStep.current !== step) heading.current?.focus();
    shownStep.current = step;
  }, [step]);

  const set = <K extends DraftField>(field: K, value: ProfileDraft[K]) => {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  };

  function next(validate: (draft: ProfileDraft) => FieldErrors, order: DraftField[], to: Step) {
    return (event: FormEvent) => {
      event.preventDefault();
      const found = validate(draft);
      setErrors(found);
      const first = order.find(field => found[field]);
      if (first) {
        document.getElementById(fieldId(first))?.focus();
        return;
      }
      setStep(to);
    };
  }

  function created(organization: OrgView) {
    clearPendingClaim();
    clearDraft(claimId);
    rememberOrg(organization.id);
    setOrg(organization);
    setStep(5);
  }

  const field = { draft, errors, set };
  // The simulated sign-in of the debug modes sends no code, so its step 4 does not promise one.
  const headline = step === 4 && inbox ? INBOX : step === 4 && !real ? SIMULATED_VERIFY : HEADLINES[step];
  return (
    <FunnelFrame eyebrow={eyebrow} title={headline.title} description={headline.description}
      aside={
        <ul className="space-y-3">
          <li className="flex gap-2.5"><LockKeyhole aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0" />Secure payment by Stripe: your card goes to Stripe, never to ARCA.</li>
          <li className="flex gap-2.5"><ShieldCheck aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0" />No password: you sign in with a code sent to your email.</li>
        </ul>
      }>
      {notice}
      <Stepper step={step} />
      <FunnelCard className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-marino/55">
          Step {step} of {STEPS.length}
        </p>
        <h2 ref={heading} tabIndex={-1} className="mt-1 font-heading text-xl font-semibold tracking-tight focus:outline-none">
          {TITLES[step]}
        </h2>
        {step === 1 && (
          <form noValidate onSubmit={next(validateYou, YOU_FIELDS, 2)} className="mt-6 space-y-5">
            <TextField id="pc-email" label="Work email" type="email" value={email ?? ""} readOnly
              hint="From your scan. Your account uses this address." className={inputClass.replace("bg-white", "bg-bruma/40")} />
            <Text name="contactName" label="Full name" autoComplete="name" maxLength={120} {...field} />
            <Choice name="contactRole" legend="Your role" options={ORG_CONTACT_ROLES.map(role => [role, CONTACT_ROLE_LABEL[role]])} {...field} />
            <Text name="phone" label="Phone" optional type="tel" autoComplete="tel" maxLength={20} {...field} />
            <Actions />
          </form>
        )}
        {step === 2 && (
          <form noValidate onSubmit={next(validateFirm, FIRM_FIELDS, 3)} className="mt-6 space-y-5">
            <Text name="legalName" label="Firm legal name" autoComplete="organization" maxLength={200} {...field} />
            <Text name="ein" label="EIN" optional inputMode="numeric" placeholder="12-3456789" maxLength={10}
              hint="It goes on your invoices as the firm's tax ID." {...field} />
            <Text name="line1" label="Street address" autoComplete="address-line1" maxLength={200} {...field} />
            <div className="grid gap-5 sm:grid-cols-[1fr_12rem_9rem]">
              <Text name="city" label="City" autoComplete="address-level2" maxLength={100} {...field} />
              <StateSelect {...field} />
              <Text name="postalCode" label="ZIP code" autoComplete="postal-code" inputMode="numeric" maxLength={10} {...field} />
            </div>
            <Choice name="attorneyRange" legend="Attorneys at the firm" options={ATTORNEY_RANGES.map(range => [range, ATTORNEY_RANGE_LABEL[range]])}
              {...field} />
            <PracticeStates {...field} />
            <Actions onBack={() => setStep(1)} />
          </form>
        )}
        {step === 3 && (
          <PlanStep legalName={draft.legalName.trim()} planCode={planCode} onPick={code => setPlanCode(code)}
            onBack={() => setStep(2)} onNext={picked => { setPlan(picked); setStep(4); }} />
        )}
        {step === 4 && (
          <VerifyStep claimId={claimId} email={email} signedInAs={signedInAs} real={real} onBack={() => setStep(3)} onCodeSent={() => setInbox(true)}
            create={() => createOrg(draft.legalName.trim(), claimId, profileOf(draft))} onCreated={created} />
        )}
        {step === 5 && org && planCode && (
          <PaymentStep org={org} plan={plan} planCode={planCode} real={real} />
        )}
      </FunnelCard>
    </FunnelFrame>
  );
}

// The left column's headline for each step (FunnelFrame), the page's h1.
const HEADLINES: Record<Step, { title: string; description: string }> = {
  1: { title: "Save your results in five short steps.", description: "Tell us who you are and which firm the account is for. Nothing is charged before the last step." },
  2: { title: "The firm behind the results.", description: "The legal name and the address go on your invoices, so the payment form does not ask for them again." },
  3: { title: "Choose how you pay.", description: "Monthly or annual, the same workspace. You can change plan or cancel from Billing." },
  4: { title: "One step from your results.", description: "We'll send a 6-digit code to verify it's you. No password, now or later." },
  5: { title: "Last step: payment.", description: "By card, through Stripe, in US dollars. Your account and your results are already saved." },
};
const SIMULATED_VERIFY = { title: "One step from your results.", description: "Confirm the email of your scan to create your account." };
const INBOX = { title: "Check your inbox.", description: "Type the 6-digit code we just sent. It creates your account and saves your results." };

const TITLES: Record<Step, string> = {
  1: "Tell us about you", 2: "Your firm", 3: "Choose your plan", 4: "Verify your email", 5: "Payment",
};

function Stepper({ step }: { step: Step }) {
  return (
    <ol aria-label="Steps" className="mt-6 grid grid-cols-5 gap-2">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li key={label} aria-current={current ? "step" : undefined} className="min-w-0">
            <span aria-hidden className={`block h-1 rounded-full ${done || current ? "bg-marino" : "bg-marino/10"}`} />
            <span className={`mt-2 flex items-center gap-2 text-xs font-semibold ${current ? "text-marino" : "text-marino/55"}`}>
              <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                done ? "bg-marino text-white" : current ? "bg-cielo/30 text-marino" : "bg-marino/5"}`}>
                {done ? <Check className="h-3 w-3" /> : number}
              </span>
              <span className="sr-only truncate sm:not-sr-only">{label}</span>
              {done && <span className="sr-only">(done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type FieldProps = { draft: ProfileDraft; errors: FieldErrors; set: <K extends DraftField>(field: K, value: ProfileDraft[K]) => void };

function TextField({ id, label, optional, hint, error, className = inputClass, ...input }: {
  id: string; label: string; optional?: boolean; hint?: string; error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-marino/55"> (optional)</span>}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy}
        className={`${className}${error ? " border-rojo" : ""}`} {...input} />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-marino/60">{hint}</p>}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-xs font-semibold text-rojo">
      {children}
    </p>
  );
}

function Text({ name, draft, errors, set, ...rest }: FieldProps & { name: "contactName" | "phone" | "legalName" | "ein" | "line1" | "city" | "postalCode";
  label: string; optional?: boolean; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <TextField id={fieldId(name)} value={draft[name]} onChange={event => set(name, event.target.value)} error={errors[name]} {...rest} />;
}

// A group of pill-shaped radios: the role, the attorneys. The radios themselves stay focusable for the keyboard.
function Choice<N extends "contactRole" | "attorneyRange">({ name, legend, options, draft, errors, set }: FieldProps & {
  name: N; legend: string; options: Array<[ProfileDraft[N], string]>;
}) {
  const error = errors[name];
  return (
    <fieldset aria-describedby={error ? `${fieldId(name)}-error` : undefined}>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([value, label], index) => (
          <label key={value} className="cursor-pointer rounded-full border border-marino/20 bg-white px-4 py-2 text-sm transition-colors hover:bg-bruma has-[:checked]:border-marino has-[:checked]:bg-marino has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cielo">
            <input type="radio" name={name} value={value} id={index === 0 ? fieldId(name) : undefined} checked={draft[name] === value}
              onChange={() => set(name, value)} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
      {error && <FieldError id={`${fieldId(name)}-error`}>{error}</FieldError>}
    </fieldset>
  );
}

function StateSelect({ draft, errors, set }: FieldProps) {
  const error = errors.state;
  return (
    <div>
      <label htmlFor={fieldId("state")} className="block text-sm font-semibold">
        State
      </label>
      <select id={fieldId("state")} value={draft.state} autoComplete="address-level1" onChange={event => set("state", event.target.value as UsStateCode)}
        aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId("state")}-error` : undefined}
        className={`${inputClass}${error ? " border-rojo" : ""}`}>
        <option value="">Choose…</option>
        {US_STATES.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}
      </select>
      {error && <FieldError id={`${fieldId("state")}-error`}>{error}</FieldError>}
    </div>
  );
}

// Fifty-one states are a long list: a filter by name, a grid that scrolls, and a line that says what is chosen, filtered or not.
function PracticeStates({ draft, errors, set }: FieldProps) {
  const [filter, setFilter] = useState("");
  const shown = US_STATES.filter(state => state.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const chosen = draft.practiceStates;
  const toggle = (code: UsStateCode) =>
    set("practiceStates", chosen.includes(code) ? chosen.filter(other => other !== code) : [...chosen, code]);
  const error = errors.practiceStates;
  return (
    <fieldset aria-describedby={[error && `${fieldId("practiceStates")}-error`, `${fieldId("practiceStates")}-chosen`].filter(Boolean).join(" ")}>
      <legend className="text-sm font-semibold">States where the firm practices</legend>
      <label htmlFor={fieldId("practiceStates")} className="sr-only">Find a state</label>
      <input id={fieldId("practiceStates")} type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Find a state"
        autoComplete="off" className={`${inputClass} sm:max-w-xs`} />
      <div className="mt-3 grid max-h-60 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-2xl border border-marino/10 p-3 sm:grid-cols-3">
        {shown.map(state => (
          <label key={state.code} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-bruma/60">
            <input type="checkbox" checked={chosen.includes(state.code)} onChange={() => toggle(state.code)}
              className="h-4 w-4 accent-[var(--color-marino)]" />
            {state.name}
          </label>
        ))}
        {shown.length === 0 && <p className="col-span-full text-sm text-marino/60">No state matches “{filter.trim()}”.</p>}
      </div>
      <p id={`${fieldId("practiceStates")}-chosen`} aria-live="polite" className="mt-2 text-xs text-marino/70">
        {chosen.length === 0 ? "None chosen yet." : `${chosen.length} selected: ${chosen.map(stateName).join(", ")}`}
      </p>
      {error && <FieldError id={`${fieldId("practiceStates")}-error`}>{error}</FieldError>}
    </fieldset>
  );
}

function Actions({ onBack, label = "Continue", busy = false }: { onBack?: () => void; label?: string; busy?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button type="submit" disabled={busy} className={buttonClass.primary}>
        {label}
      </button>
      {onBack && (
        <button type="button" onClick={onBack} className={buttonClass.secondary}>
          Back
        </button>
      )}
    </div>
  );
}

function PlanStep({ legalName, planCode, onPick, onBack, onNext }: {
  legalName: string; planCode: string | null; onPick: (code: string) => void; onBack: () => void; onNext: (plan: PlanView) => void;
}) {
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // From the API's plans table, so a price changed there shows here.
  useEffect(() => {
    let cancelled = false;
    getPlans()
      .then(list => {
        if (!cancelled) setPlans(list);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const picked = plans?.find(plan => plan.code === planCode);
    if (!picked) {
      setError("Choose a plan.");
      document.getElementById("pc-plan")?.focus();
      return;
    }
    onNext(picked);
  }

  return (
    <form noValidate onSubmit={submit} className="mt-6 space-y-6">
      {plans === null ? (
        failed ? (
          <div role="alert" className="text-sm">
            We could not load the plans.{" "}
            <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : (
          <p role="status" className="text-sm text-marino/70">Loading plans…</p>
        )
      ) : (
        <fieldset aria-describedby={error ? "pc-plan-error" : undefined}>
          <legend className="sr-only">Plan</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan, index) => (
              <label key={plan.code} className="flex cursor-pointer flex-col rounded-3xl border border-marino/15 bg-white p-5 transition-colors hover:border-marino/40 has-[:checked]:border-marino has-[:checked]:bg-bruma/40 has-[:checked]:ring-2 has-[:checked]:ring-cielo has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cielo">
                <input type="radio" name="plan" value={plan.code} id={index === 0 ? "pc-plan" : undefined} checked={planCode === plan.code}
                  onChange={() => { onPick(plan.code); setError(null); }} className="sr-only" />
                <span className="font-heading text-lg font-semibold">{plan.name}</span>
                <span className="mt-1 font-heading text-2xl font-semibold">{formatPrice(plan)}</span>
                <span className="mt-1 text-xs text-marino/60">{plan.interval === "year" ? "Billed once a year" : "Billed every month"}</span>
              </label>
            ))}
          </div>
          {error && <FieldError id="pc-plan-error">{error}</FieldError>}
        </fieldset>
      )}
      <section aria-labelledby="pc-plan-summary" className="rounded-3xl bg-bruma/50 p-5">
        <h3 id="pc-plan-summary" className="font-heading text-base font-semibold">What {legalName} gets</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {[`The analysis you just ran, saved to ${legalName}, with its action plan.`,
            "A workspace for your colleagues: invite them and choose what each one can do.",
            "Manage or cancel the plan from Billing."].map(line => (
            <li key={line} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-marino/65">Billed in US dollars, by card. Nothing is charged before the payment step.</p>
      </section>
      <Actions onBack={onBack} />
    </form>
  );
}

function VerifyStep({ claimId, email, signedInAs, real, onBack, onCodeSent, create, onCreated }: {
  claimId: string; email: string | null; signedInAs: string | null; real: boolean; onBack: () => void; onCodeSent: () => void;
  create: () => Promise<OrgView>; onCreated: (org: OrgView) => void;
}) {
  // The email the back enrolled: once per flow, so a new code never enrolls again (DN-13 §17.8 step 2).
  const [enrolled, setEnrolled] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [session, setSession] = useState(signedInAs);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const next = `/app/signup?claim=${encodeURIComponent(claimId)}`;

  async function make() {
    setBusy(true);
    setMessage(null);
    try {
      onCreated(await create());
    } catch (cause) {
      // The claim stays in the tab: the API refused this attempt, and nothing was created.
      setMessage(cause instanceof ApiError ? cause.message : "We could not create your account. Please try again.");
      setBusy(false);
    }
  }

  async function sendCode() {
    setBusy(true);
    setMessage(null);
    let address = enrolled;
    if (!address) {
      try {
        address = (await enroll({ claimId })).email;
        setEnrolled(address);
      } catch (cause) {
        setMessage(enrollFailure(cause, "claim"));
        setBusy(false);
        return;
      }
    }
    if (await requestCode(address, next)) {
      setCodeSent(true);
      onCodeSent();
    } else setMessage(CODE_NOT_SENT);
    setBusy(false);
  }

  // The simulated accounts: the debug modes sign in as the claim's email; production without the webapp says it is not there.
  async function simulated() {
    setBusy(true);
    setMessage(null);
    if (!session && email && (await signIn(email)) !== "signed_in") {
      setMessage(SIGN_IN_NOT_AVAILABLE);
      setBusy(false);
      return;
    }
    setSession(email);
    await make();
  }

  const alert = message && (
    <p role="alert" className="mt-4 text-sm text-rojo">
      {message}
    </p>
  );

  if (session) {
    return (
      <div className="mt-6">
        <IdentityChip email={session} source="Signed in" />
        <p className="mt-4 text-sm text-marino/80">
          You&apos;re signed in as <strong>{session}</strong>, so there is no code to type.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={make} disabled={busy} className={buttonClass.primary}>
            Continue to payment
          </button>
          {!busy && <button type="button" onClick={onBack} className={buttonClass.secondary}>Back</button>}
        </div>
        {alert}
      </div>
    );
  }
  if (!real) {
    return (
      <div className="mt-6">
        {email && <IdentityChip email={email} source="From your scan" />}
        <p className="mt-4 text-sm text-marino/80">
          Confirm <strong>{email}</strong> to create your account and your organization.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={simulated} disabled={busy} className={buttonClass.primary}>
            Create my account
          </button>
          <button type="button" onClick={onBack} disabled={busy} className={buttonClass.secondary}>Back</button>
        </div>
        {alert}
      </div>
    );
  }
  if (codeSent && enrolled) {
    return (
      <>
        <CodeEntry email={enrolled} next={next} onVerified={() => { setSession(enrolled); void make(); }} />
        {alert}
      </>
    );
  }
  return (
    <div className="mt-6">
      {email && <IdentityChip email={email} source="From your scan" />}
      <p className="mt-4 text-sm text-marino/80">
        {`We'll send a 6-digit code to ${email ? "this address" : "the email of your scan"} to verify it's you — no password. The code creates your account.`}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={sendCode} disabled={busy} className={buttonClass.primary}>
          Send my code
        </button>
        <button type="button" onClick={onBack} disabled={busy} className={buttonClass.secondary}>Back</button>
      </div>
      {alert}
    </div>
  );
}

function PaymentStep({ org, plan, planCode, real }: { org: OrgView; plan: PlanView | null; planCode: string; real: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // The debug modes pay on the simulated checkout, another page, with no Stripe at all.
  async function simulatedPayment() {
    setBusy(true);
    setMessage(null);
    try {
      window.location.assign((await checkout(org.id, planCode)).url);
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "The payment could not open. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-marino/80">
        Your account and <strong>{org.name}</strong> are ready.
        {plan && <> {plan.name}, <strong>{formatPrice(plan)}</strong>.</>}
      </p>
      {real ? (
        <EmbeddedPayment key={planCode} orgId={org.id} planCode={planCode} />
      ) : (
        <div>
          <button type="button" onClick={simulatedPayment} disabled={busy} className={buttonClass.primary}>
            Continue to payment
          </button>
          {message && (
            <p role="alert" className="mt-4 text-sm text-rojo">
              {message}
            </p>
          )}
        </div>
      )}
      <p className="text-xs text-marino/60">
        Prefer to pay later? You can finish later from Billing.{" "}
        <Link href="/app/billing" className="font-semibold underline underline-offset-2">Go to Billing</Link>
      </p>
    </div>
  );
}
