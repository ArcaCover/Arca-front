"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE, useBrowser } from "@/components/app/AppContext";
import CodeEntry from "@/components/app/CodeEntry";
import FunnelFrame, { FunnelCard, IdentityChip } from "@/components/app/FunnelFrame";
import SimulationNotice from "@/components/app/SimulationNotice";
import { buttonClass, inputClass } from "@/components/app/ui";
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
    <FunnelFrame eyebrow="Join an organization" title={codeSent && enrolled ? "Check your inbox." : "You're invited."}
      description={codeSent && enrolled ? "Type the 6-digit code from the email to join." : "Your colleagues already use ARCA. Verify your email to join them: no password."}>
      <FunnelCard>
        <h2 className="font-heading text-xl font-semibold tracking-tight">{codeSent && enrolled ? "Enter your code" : "Accept the invitation"}</h2>
        {codeSent && enrolled ? (
          <CodeEntry email={enrolled} next={next} onVerified={() => void accept()} />
        ) : (
          <div className="mt-6 space-y-4">
            {enrolled && <IdentityChip email={enrolled} source="From your invitation" />}
            <p className="text-sm text-marino/70">
              {session
                ? `Signed in as ${session.email}. The invitation is for one email: for any other, we email a 6-digit code to the invited address.`
                : "We'll send a 6-digit code to the address this invitation was sent to, to verify it's you."}
            </p>
            <button type="button" onClick={start} disabled={busy} className={buttonClass.primary}>
              {session ? "Accept invitation" : "Send my code"}
            </button>
          </div>
        )}
        {message && (
          <p role="alert" className="mt-4 text-sm">
            {message}
          </p>
        )}
      </FunnelCard>
    </FunnelFrame>
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
    <FunnelFrame eyebrow="Join an organization" title="You're invited." description="Sign in with the email the invitation was sent to.">
      <SimulationNotice className="mb-4" />
      <FunnelCard>
      <form onSubmit={accept} className="space-y-4">
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
          <label className="block text-sm font-semibold">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className={inputClass}
            />
          </label>
        )}
        <button type="submit" disabled={busy || !browser} className={buttonClass.primary}>
          {session ? "Accept invitation" : "Sign in and accept"}
        </button>
      </form>
      {message && (
        <p role="alert" className="mt-4 text-sm">
          {message}
        </p>
      )}
      </FunnelCard>
    </FunnelFrame>
  );
}
