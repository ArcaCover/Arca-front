"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SIGN_IN_NOT_AVAILABLE, useBrowser } from "@/components/app/AppContext";
import { ApiError } from "@/lib/api/client";
import { signIn } from "@/lib/app/auth";
import { createOrg } from "@/lib/app/client";
import { clearPendingClaim, loadAppSession, loadPendingClaim, rememberOrg } from "@/lib/app/session";

// Sign-up exists only to save the results of an analysis (DN-10 §3): the claim ticket the results page kept in this tab
// carries the email the account is created for, so it is shown locked.
function SignupScreen() {
  const router = useRouter();
  const requested = useSearchParams().get("claim");
  const browser = useBrowser();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pending = browser ? loadPendingClaim() : null;
  const claim = pending && (!requested || requested === pending.claimId) ? pending : null;

  if (!browser) return null;
  if (!claim) {
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
  const { claimId, email } = claim;

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
      <h1 className="font-heading text-2xl">Save your results and activate your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            readOnly
            className="mt-1 block w-full rounded-xl border border-marino/20 bg-bruma/40 px-3 py-2"
          />
        </label>
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
