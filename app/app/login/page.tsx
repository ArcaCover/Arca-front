"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE } from "@/components/app/AppContext";
import CodeEntry from "@/components/app/CodeEntry";
import FunnelFrame, { FunnelCard } from "@/components/app/FunnelFrame";
import SimulationNotice from "@/components/app/SimulationNotice";
import { buttonClass, inputClass } from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { realAccounts } from "@/lib/app/accounts";
import { requestCode, signIn } from "@/lib/app/auth";

// Sign-in never creates an account (DN-10 §4.7): accounts come from saving the results of an analysis or from an
// invitation. With the real accounts it is an emailed code (DN-13 §4.2); in the debug modes, the simulated sign-in.
export default function LoginPage() {
  return realAccounts() ? <CodeLogin /> : <SimulatedLogin />;
}

/**
 * Email, then the 6-digit code. Whether Supabase sent a code or refused an email without an account, the page says the
 * same and asks for the code, so it never tells who is a customer (DN-13 §4.2).
 */
function CodeLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    setBusy(true);
    await requestCode(address, "/app");
    setSentTo(address);
    setBusy(false);
  }

  return (
    <FunnelFrame eyebrow="Sign in" title={sentTo ? "Check your inbox." : "Welcome back."}
      description={sentTo ? "Type the 6-digit code from the email to sign in." : "We'll email you a 6-digit code to verify it's you. There is no password."}>
      <FunnelCard>
        <h2 className="font-heading text-xl font-semibold tracking-tight">{sentTo ? "Enter your code" : "Your work email"}</h2>
        {sentTo ? (
          <CodeEntry email={sentTo} next="/app" neutral onVerified={() => router.replace("/app")}>
            <button type="button" onClick={() => setSentTo(null)} className="text-sm font-semibold underline underline-offset-2">
              Use a different email
            </button>
          </CodeEntry>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className={inputClass}
              />
            </label>
            <button type="submit" disabled={busy} className={buttonClass.primary}>
              Send my code
            </button>
          </form>
        )}
      </FunnelCard>
    </FunnelFrame>
  );
}

function SimulatedLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const signedIn = platformAdmin ? await signIn(email.trim(), { platformAdmin }) : await signIn(email.trim());
      if (signedIn === "signed_in") {
        router.replace(platformAdmin ? "/app/admin" : "/app");
        return;
      }
      setMessage(SIGN_IN_NOT_AVAILABLE);
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "We could not sign you in. Please try again.");
    }
    setBusy(false);
  }

  return (
    <FunnelFrame eyebrow="Sign in" title="Welcome back.">
      <SimulationNotice className="mb-4" />
      <FunnelCard>
      <form onSubmit={submit} className="space-y-5">
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
        {/* DN-10 §4.6: in mock, the simulated sign-in is also how someone at ARCA becomes a platform admin. Mock only, like
            the panel's sign-ins as a role: live-debug simulates the customer's account, not ARCA's staff. */}
        {process.env.NEXT_PUBLIC_ARCA_MODE === "mock" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={platformAdmin} onChange={event => setPlatformAdmin(event.target.checked)} />
            Sign in as an ARCA platform admin (mock)
          </label>
        )}
        <button type="submit" disabled={busy} className={buttonClass.primary}>
          Sign in
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
