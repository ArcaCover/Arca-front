"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useBrowser } from "@/components/app/AppContext";
import PreCheckout from "@/components/app/PreCheckout";
import SimulationNotice from "@/components/app/SimulationNotice";
import { buttonClass } from "@/components/app/ui";
import { realAccounts } from "@/lib/app/accounts";
import { currentAppSession, loadAppSession, loadPendingClaim, type SignedIn } from "@/lib/app/session";

const sameEmail = (a: string | undefined, b: string) => a !== undefined && a.toLowerCase() === b.toLowerCase();

// Sign-up exists only to save the results of an analysis (DN-10 §3): the claim ticket the results page kept in this tab carries
// the email the account is created for, shown locked. It is the pre-checkout of DN-13 §19: who you are, your firm, the plan, the
// emailed code (the real accounts) or the simulated sign-in (the debug modes), and the payment.
function SignupScreen() {
  const router = useRouter();
  const requested = useSearchParams().get("claim");
  const browser = useBrowser();
  const real = realAccounts();
  // Kept after the address bar loses it.
  const [linked] = useState(requested);
  // The Supabase session of the real accounts: undefined until the client answers. The simulated one is read at once.
  const [session, setSession] = useState<SignedIn | null | undefined>(undefined);

  // The fallback link of the email comes back here with the claim in the URL (DN-13 §4.7), maybe on a tab or a device without the
  // pending claim: the page uses the URL's claim and the session's email, and drops the claim from the address bar at once.
  useEffect(() => {
    if (real && requested) router.replace("/app/signup");
  }, [real, requested, router]);

  useEffect(() => {
    if (!real) return;
    let cancelled = false;
    void currentAppSession().then(current => {
      if (!cancelled) setSession(current);
    });
    return () => {
      cancelled = true;
    };
  }, [real]);

  if (!browser || (real && session === undefined)) return null;
  const pending = loadPendingClaim();
  const fromUrl = real ? linked : requested;
  const fromTab = pending && (!fromUrl || fromUrl === pending.claimId) ? pending : null;
  // Only the real accounts take a claim from the URL alone: the back checks the session's email against the ticket's.
  const claimId = fromTab?.claimId ?? (real ? linked : null);
  if (!claimId) return <NoClaim />;
  const live = real ? session ?? null : loadAppSession();
  const email = fromTab?.email ?? live?.email ?? null;
  // Someone already signed in as the claim's email (or, with a claim from the URL, whoever is signed in) needs no code.
  const signedInAs = live && (fromTab ? sameEmail(live.email, fromTab.email) : real) ? live.email : null;

  return (
    <PreCheckout key={claimId} claimId={claimId} email={email} signedInAs={signedInAs} real={real} notice={<SimulationNotice className="mb-4" />}
      eyebrow={signedInAs ? "Save your results to a new organization" : "Save your results and activate your account"} />
  );
}

function NoClaim() {
  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Create your organization</h1>
      <p className="mt-3 text-sm text-marino/70">
        An account starts from the results of an analysis. Run a scan and an assessment, then save your results.
      </p>
      <Link href="/quote" className={`${buttonClass.primary} mt-4`}>
        Start an analysis
      </Link>
      <p className="mt-6 text-sm text-marino/70">
        Already created your organization?{" "}
        <Link href="/app/billing" className="font-semibold underline underline-offset-2">
          Finish the payment from Billing
        </Link>
      </p>
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
