"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE, useBrowser } from "@/components/app/AppContext";
import CodeEntry from "@/components/app/CodeEntry";
import SimulationNotice from "@/components/app/SimulationNotice";
import { ApiError } from "@/lib/api/client";
import { realAccounts } from "@/lib/app/accounts";
import { requestCode, signIn, signOut } from "@/lib/app/auth";
import { acceptInvitation, enroll } from "@/lib/app/client";
import { CODE_NOT_SENT, enrollFailure } from "@/lib/app/enroll-failure";
import { currentAppSession, loadAppSession, rememberOrg, type SignedIn } from "@/lib/app/session";

// An invited person skips the funnel and the payment: the organization already pays (DN-10 §3). The token stays in the
// URL it came in and is never shown on the page. The real accounts sign in with an emailed code (DN-13 §4.6, §8.1); the
// debug modes with the simulated sign-in.
export default function InvitePage() {
  return realAccounts() ? <RealInvite /> : <SimulatedInvite />;
}

/**
 * The real accounts (DN-13 §4.6): the back enrolls the invited email, the page shows it locked, Supabase emails a code, and
 * with the session the invitation is accepted. Nothing happens on opening the page, which mail filters do: the person starts
 * it. Someone already signed in with the invited email accepts without a code; anyone else signs in as the invited email.
 */
function RealInvite() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SignedIn | null | undefined>(undefined);
  const [enrolled, setEnrolled] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const next = `/app/invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    void currentAppSession().then(current => {
      if (!cancelled) setSession(current);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function accept() {
    setBusy(true);
    setMessage(null);
    try {
      const org = await acceptInvitation(token);
      rememberOrg(org.id);
      router.replace("/app");
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "We could not accept the invitation. Please try again.");
      setBusy(false);
    }
  }

  // Enroll once; a code that could not be sent is asked for again without it (DN-13 §17.8 step 2).
  async function start() {
    setBusy(true);
    setMessage(null);
    let address = enrolled;
    if (!address) {
      try {
        address = (await enroll({ invitationToken: token })).email;
        setEnrolled(address);
      } catch (cause) {
        setMessage(enrollFailure(cause, "invitation"));
        setBusy(false);
        return;
      }
    }
    if (session && session.email.toLowerCase() === address.toLowerCase()) {
      await accept();
      return;
    }
    if (await requestCode(address, next)) setCodeSent(true);
    else setMessage(CODE_NOT_SENT);
    setBusy(false);
  }

  if (session === undefined) return null;
  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Join an organization</h1>
      {codeSent && enrolled ? (
        <CodeEntry email={enrolled} next={next} onVerified={() => void accept()} />
      ) : (
        <div className="mt-6 space-y-4">
          {enrolled && (
            <label className="block text-sm">
              Email
              <input
                type="email"
                value={enrolled}
                readOnly
                className="mt-1 block w-full rounded-xl border border-marino/20 bg-bruma/40 px-3 py-2"
              />
            </label>
          )}
          <p className="text-sm text-marino/70">
            {session
              ? `Signed in as ${session.email}. The invitation is for one email: for any other, we email a 6-digit code to the invited address.`
              : "We will email a 6-digit code to the address this invitation was sent to."}
          </p>
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {session ? "Accept invitation" : "Email me a sign-in code"}
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
function SimulatedInvite() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const browser = useBrowser();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Set once the person signs out here, so the page asks for the invited email instead.
  const [signedOut, setSignedOut] = useState(false);
  const session = browser && !signedOut ? loadAppSession() : null;

  async function accept(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (!session && (await signIn(email.trim())) !== "signed_in") {
        setMessage(SIGN_IN_NOT_AVAILABLE);
        setBusy(false);
        return;
      }
      const org = await acceptInvitation(token);
      rememberOrg(org.id);
      router.replace("/app");
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "We could not accept the invitation. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Join an organization</h1>
      <p className="mt-3 text-sm text-marino/70">Sign in with the email the invitation was sent to.</p>
      <SimulationNotice />
      <form onSubmit={accept} className="mt-6 space-y-4">
        {session ? (
          <p className="text-sm">
            Signed in as {session.email}.{" "}
            {/* The invitation is for one email: someone else signed in on this browser has to leave first. */}
            <button
              type="button"
              onClick={() => {
                void signOut();
                setSignedOut(true);
              }}
              className="font-semibold underline"
            >
              Not you? Sign out
            </button>
          </p>
        ) : (
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-marino/20 bg-white px-3 py-2"
            />
          </label>
        )}
        <button type="submit" disabled={busy || !browser} className="rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60">
          {session ? "Accept invitation" : "Sign in and accept"}
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
