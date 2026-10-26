"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { OrgView } from "@arca/contracts";

import { activeOrg } from "@/components/app/AppContext";
import { ApiError } from "@/lib/api/client";
import { recallSession } from "@/lib/api/session";
import { attachAnalysis, createClaim, getMe } from "@/lib/app/client";
import { loadAppSession, savePendingClaim } from "@/lib/app/session";

// The end of the anonymous funnel (DN-10 §3). The scan token is traded for a one-use claim ticket: a visitor without an
// organization takes it to sign-up, and a signed-in customer adds the analysis to the organization they already have.
export default function SaveResultsCta({ scanId }: { scanId: string }) {
  const router = useRouter();
  // undefined while /me is asked; null when the analysis is going to a new organization through sign-up.
  const [target, setTarget] = useState<OrgView | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const lookup = loadAppSession() ? getMe().then(me => activeOrg(me.organizations)) : Promise.resolve(null);
    // A /me that fails leaves the sign-up path, which still works: the results are never blocked by it.
    lookup
      .catch(() => null)
      .then(org => {
        if (!cancelled) setTarget(org);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (target) {
        await attachAnalysis(target.id, claim.claimId);
        router.push("/app");
      } else {
        savePendingClaim(claim);
        router.push(`/app/signup?claim=${encodeURIComponent(claim.claimId)}`);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We could not save your results. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="mt-7 rounded-[28px] border border-marino/8 bg-white p-6 sm:p-8">
      <h2 className="font-heading text-xl font-medium tracking-tight">Keep these results.</h2>
      <p className="mt-2 text-sm leading-7 text-marino/70">
        {target
          ? "Save this analysis with the others in your organization."
          : "Create your organization to keep this analysis and invite your colleagues."}
      </p>
      <button
        type="button"
        onClick={save}
        disabled={busy || target === undefined}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-oro px-5 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {target ? `Add this analysis to ${target.name}` : "Save your results and activate your account"}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rojo">
          {error}
        </p>
      )}
    </section>
  );
}
