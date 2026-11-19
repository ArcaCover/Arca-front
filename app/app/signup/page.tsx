"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE, useBrowser } from "@/components/app/AppContext";
import CodeEntry from "@/components/app/CodeEntry";
import SimulationNotice from "@/components/app/SimulationNotice";
import { ApiError } from "@/lib/api/client";
import { realAccounts } from "@/lib/app/accounts";
import { requestCode, signIn } from "@/lib/app/auth";
import { createOrg, enroll } from "@/lib/app/client";
import { CODE_NOT_SENT, enrollFailure } from "@/lib/app/enroll-failure";
import {
  clearPendingClaim, currentAppSession, loadAppSession, loadPendingClaim, rememberOrg, type SignedIn,
} from "@/lib/app/session";

const sameEmail = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Sign-up exists only to save the results of an analysis (DN-10 §3): the claim ticket the results page kept in this tab
// carries the email the account is created for, so it is shown locked. The real accounts sign in with an emailed code
// (DN-13 §8.1); the debug modes with the simulated sign-in.
function SignupScreen() {
  return realAccounts() ? <RealSignup /> : <SimulatedSignup />;
}

function NoClaim() {
  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Create your organization</h1>
      <p className="mt-3 text-sm text-marino/70">
        An account starts from the results of an analysis. Run a scan and an assessment, then save your results.
      </p>
      <Link href="/quote" className="mt-4 inline-flex rounded-full bg-oro px-4 py-2 text-sm font-semibold">
        Start an analysis
      </Link>
    </section>
  );
}

function LockedEmail({ email }: { email: string }) {
  return (
    <label className="block text-sm">
      Email
      <input
        type="email"
        value={email}
        readOnly
        className="mt-1 block w-full rounded-xl border border-marino/20 bg-bruma/40 px-3 py-2"
      />
    </label>
  );
}

/**
 * The real accounts (DN-13 §3.1, §8.1): 1) the back enrolls the claim's email and Supabase emails a code; 2) the code signs
 * in; 3) the organization's name, and POST /orgs spends the claim. The fallback link of the email comes back here with the
 * claim in the URL (§4.7), maybe on a tab or a device without the pending claim: the page then uses the URL's claim and the
 * session's email, and drops the claim from the address bar at once. The back refuses (403) a session whose email is not
 * the ticket's.
 */
function RealSignup() {
  const router = useRouter();
  const requested = useSearchParams().get("claim");
  const browser = useBrowser();
  // Kept after the address bar loses it.
  const [linked] = useState(requested);
  // undefined until the Supabase client answers.
  const [session, setSession] = useState<SignedIn | null | undefined>(undefined);
  // The email the back enrolled: set once, so a new code never enrolls again (DN-13 §17.8 step 2).
  const [enrolled, setEnrolled] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (requested) router.replace("/app/signup");
  }, [requested, router]);

  useEffect(() => {
    let cancelled = false;
    void currentAppSession().then(current => {
      if (!cancelled) setSession(current);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!browser || session === undefined) return null;
  const pending = loadPendingClaim();
  const fromTab = pending && (!linked || linked === pending.claimId) ? pending : null;
  const claimId = fromTab?.claimId ?? linked;
  if (!claimId) return <NoClaim />;
  // The organization's step: for someone signed in as the claim's email or, without the tab's claim, for whoever is signed in
  // (the back checks the session's email against the ticket's).
  const ready = session !== null && (fromTab ? sameEmail(session.email, fromTab.email) : true);
  const email = ready ? session.email : (enrolled ?? fromTab?.email ?? null);
  const next = `/app/signup?claim=${encodeURIComponent(claimId)}`;
  // Someone who already had the claim's session keeps their account and only starts an organization, as the results'
  // button said (SaveResultsCta).
  const title = fromTab && ready && !enrolled ? "Save your results to a new organization" : "Save your results and activate your account";

  async function sendCode() {
    setBusy(true);
    setMessage(null);
    let address = enrolled;
    if (!address) {
      try {
        address = (await enroll({ claimId: claimId! })).email;
        setEnrolled(address);
      } catch (cause) {
        setMessage(enrollFailure(cause, "claim"));
        setBusy(false);
        return;
      }
    }
    if (await requestCode(address, next)) setCodeSent(true);
    else setMessage(CODE_NOT_SENT);
    setBusy(false);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const org = await createOrg(name.trim(), claimId!);
      clearPendingClaim();
      rememberOrg(org.id);
      router.push("/app/billing");
    } catch (cause) {
      // The claim stays in the tab: the API refused this attempt, and nothing was created.
      setMessage(cause instanceof ApiError ? cause.message : "We could not create your organization. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">{title}</h1>
      {ready ? (
        <form onSubmit={create} className="mt-6 space-y-4">
          <LockedEmail email={session.email} />
          <label className="block text-sm">
            Organization name
            <input
              required
              maxLength={120}
              value={name}
              onChange={event => setName(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-marino/20 bg-white px-3 py-2"
            />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60">
            Create organization
          </button>
        </form>
      ) : codeSent && enrolled ? (
        <CodeEntry email={enrolled} next={next} onVerified={() => void currentAppSession().then(setSession)} />
      ) : (
        <div className="mt-6 space-y-4">
          {email && <LockedEmail email={email} />}
          <p className="text-sm text-marino/70">We will email a 6-digit code to this address to confirm it is yours.</p>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Email me a sign-in code
          </button>
        </div>
      )}
      {message && (
        <p role="alert" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

/** The simulated accounts of the debug modes (DN-10), and production without the webapp, which says it is not available. */
function SimulatedSignup() {
  const router = useRouter();
  const requested = useSearchParams().get("claim");
  const browser = useBrowser();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pending = browser ? loadPendingClaim() : null;
  const claim = pending && (!requested || requested === pending.claimId) ? pending : null;

  if (!browser) return null;
  if (!claim) return <NoClaim />;
  const { claimId, email } = claim;
  // Someone already signed in with the claim's email has an account: the sign-up only starts a new organization for them,
  // as the button that led here said (SaveResultsCta). Anyone else is signed in as the claim's email on submit.
  const hasAccount = loadAppSession()?.email.toLowerCase() === email.toLowerCase();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const signedInAs = loadAppSession()?.email.toLowerCase();
      if (signedInAs !== email.toLowerCase() && (await signIn(email)) !== "signed_in") {
        setMessage(SIGN_IN_NOT_AVAILABLE);
        setBusy(false);
        return;
      }
      const org = await createOrg(name.trim(), claimId);
      clearPendingClaim();
      rememberOrg(org.id);
      router.push("/app/billing");
    } catch (cause) {
      // The claim stays in the tab: the API refused this attempt, and nothing was created.
      setMessage(cause instanceof ApiError ? cause.message : "We could not create your organization. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">
        {hasAccount ? "Save your results to a new organization" : "Save your results and activate your account"}
      </h1>
      <SimulationNotice />
      <form onSubmit={submit} className="mt-6 space-y-4">
        <LockedEmail email={email} />
        <label className="block text-sm">
          Organization name
          <input
            required
            maxLength={120}
            value={name}
            onChange={event => setName(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-marino/20 bg-white px-3 py-2"
          />
        </label>
        <button type="submit" disabled={busy} className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60">
          Create organization
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupScreen />
    </Suspense>
  );
}
