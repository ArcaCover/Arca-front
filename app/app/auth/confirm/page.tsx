"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { realAccounts } from "@/lib/app/accounts";
import { confirmLink, safeNext } from "@/lib/app/auth";

// Where the fallback link of a sign-in email lands (DN-13 §4.1, §4.9): `?next=…&token_hash=…&type=email`. Opening the page
// signs no one in: law firms' mail filters open every link to scan it, and would spend the single-use token. Only the button
// does, with verifyOtp on the token hash, which needs no PKCE verifier, so the link also works on another device.
function ConfirmScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!realAccounts()) {
    return (
      <Shell>
        <p className="mt-3 text-sm text-marino/70">Sign-in links are not used in this environment.</p>
        <SignInLink />
      </Shell>
    );
  }
  if (!tokenHash || (type !== null && type !== "email")) {
    return (
      <Shell>
        <p className="mt-3 text-sm text-marino/70">
          This sign-in link is incomplete. Open the latest email again, or sign in to get a new code.
        </p>
        <SignInLink />
      </Shell>
    );
  }
  const hash = tokenHash;

  async function proceed() {
    setBusy(true);
    setFailed(false);
    if (await confirmLink(hash)) {
      router.replace(next);
      return;
    }
    setFailed(true);
    setBusy(false);
  }

  return (
    <Shell>
      <p className="mt-3 text-sm text-marino/70">Press the button to finish signing in on this device.</p>
      <button
        type="button"
        onClick={proceed}
        disabled={busy}
        className="mt-6 rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60"
      >
        Continue signing in
      </button>
      {failed && (
        <div role="alert" className="mt-4 text-sm">
          <p className="text-rojo">This link has expired or was already used. Sign in again to get a new code.</p>
          <SignInLink />
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Confirm your sign-in</h1>
      {children}
    </section>
  );
}

function SignInLink() {
  return (
    <Link href="/app/login" className="mt-4 inline-flex rounded-full border border-marino/20 px-4 py-2 text-sm font-semibold">
      Sign in
    </Link>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmScreen />
    </Suspense>
  );
}
