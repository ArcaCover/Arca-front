"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { AnalysisView } from "@arca/contracts";

import AnalysisCard from "@/components/app/AnalysisCard";
import { useApp, useFailure } from "@/components/app/AppContext";
import { listAnalyses } from "@/lib/app/client";

function Panel() {
  const { org } = useApp();
  const fail = useFailure();
  const paid = useSearchParams().get("paid") === "1";
  const [analyses, setAnalyses] = useState<AnalysisView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The API decides who gets in: an unpaid organization answers 402 here and the page moves on to billing.
  useEffect(() => {
    let cancelled = false;
    listAnalyses(org.id)
      .then(list => {
        if (!cancelled) setAnalyses(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(fail(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [org.id, fail]);

  return (
    <>
      <h1 className="font-heading text-2xl">Your analyses</h1>
      {paid && <p className="mt-3 text-sm">Payment received. Your organization is active.</p>}
      {org.deletionPending && (
        <p className="mt-3 rounded-2xl bg-oro/20 p-4 text-sm">
          A deletion request is pending review by ARCA. Nothing is deleted until then, and access continues meanwhile.
        </p>
      )}
      {org.billingStatus === "past_due" && (
        <p className="mt-3 rounded-2xl bg-oro/20 p-4 text-sm">The last payment failed. Access continues for now.</p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rojo">
          {error}
        </p>
      )}
      {analyses === null ? (
        !error && (
          <p role="status" className="mt-6 text-sm text-marino/70">
            Loading analyses…
          </p>
        )
      ) : (
        <div className="mt-6 space-y-6">
          {analyses.length === 0 && <p className="text-sm text-marino/70">No analyses saved yet.</p>}
          {analyses.map(analysis => (
            <AnalysisCard key={analysis.scanId} analysis={analysis} />
          ))}
        </div>
      )}
      <section className="mt-10 rounded-3xl border border-marino/10 bg-white p-6">
        <h2 className="font-heading text-lg">Add an analysis</h2>
        <p className="mt-2 text-sm text-marino/70">
          Run a new scan and assessment. When the results are ready, save them to {org.name}.
        </p>
        <Link href="/quote" className="mt-4 inline-flex items-center gap-2 rounded-full bg-oro px-4 py-2 text-sm font-semibold">
          <Plus aria-hidden className="h-4 w-4" />
          Add an analysis
        </Link>
      </section>
    </>
  );
}

export default function AppHomePage() {
  return (
    <Suspense fallback={null}>
      <Panel />
    </Suspense>
  );
}
