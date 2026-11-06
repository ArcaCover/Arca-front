"use client";

import { useEffect, useState } from "react";
import type { AnalysisView } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { adaptScore } from "@/lib/api/adapt";
import { listAnalyses } from "@/lib/app/client";
import type { TierName } from "@/lib/score-tiers";

/**
 * The organization's claimed analyses, from the API (DN-10). An unpaid organization answers 402 here, and useFailure
 * sends the page to billing. Newest first.
 */
export function useAnalyses(): { analyses: AnalysisView[] | null; error: string | null } {
  const { org } = useApp();
  const fail = useFailure();
  const [analyses, setAnalyses] = useState<AnalysisView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAnalyses(org.id)
      .then(list => {
        if (!cancelled) setAnalyses([...list].sort((a, b) => b.claimedAt.localeCompare(a.claimedAt)));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(fail(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [org.id, fail]);

  return { analyses, error };
}

/** The headline numbers of an analysis: the assessment's when there is one, otherwise the scan's, as AnalysisCard shows. */
export function headline(analysis: AnalysisView): { score: number | null; tier: TierName; kind: "Scan and assessment" | "Scan only" } {
  if (analysis.assessment) {
    return { score: analysis.assessment.compositeScore, tier: analysis.assessment.tier, kind: "Scan and assessment" };
  }
  const scan = adaptScore(analysis.layer1, analysis.scanStatus);
  return { score: scan.score, tier: scan.tier, kind: "Scan only" };
}
