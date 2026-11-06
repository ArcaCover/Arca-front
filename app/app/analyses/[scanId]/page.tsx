"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileSearch, ListChecks, RotateCw } from "lucide-react";
import type { AnalysisView } from "@arca/contracts";

import AnalysisCard from "@/components/app/AnalysisCard";
import { headline, useAnalyses } from "@/components/app/useAnalyses";
import { Badge, Card, EmptyState, PageHeader, Sparkline, Tabs, buttonClass, formatDate } from "@/components/app/ui";
import { SignalCard } from "@/components/score";
import { SAMPLE_SCORE_HISTORY } from "@/lib/app/mock/records";
import { signalsToCards } from "@/lib/signals-view";

type Section = "overview" | "signals" | "plan" | "history";

export default function AnalysisDetailPage() {
  const { scanId } = useParams<{ scanId: string }>();
  // The same list the index shows: the API has no single-analysis endpoint, and the 402 to billing still applies here.
  const { analyses, error } = useAnalyses();
  const analysis = analyses?.find(item => item.scanId === scanId) ?? null;

  const back = (
    <Link href="/app/analyses" className={buttonClass.ghost}>
      <ArrowLeft aria-hidden className="h-4 w-4" />
      All analyses
    </Link>
  );

  if (analyses === null) {
    return (
      <>
        <div className="mb-4">{back}</div>
        {error ? (
          <p role="alert" className="text-sm text-rojo">
            {error}
          </p>
        ) : (
          <p role="status" className="rounded-3xl border border-marino/10 bg-white p-6 text-sm text-marino/70">
            Loading analysis…
          </p>
        )}
      </>
    );
  }

  if (!analysis) {
    return (
      <>
        <div className="mb-4">{back}</div>
        <EmptyState
          icon={FileSearch}
          title="Analysis not found"
          description="It may belong to another organization, or the link is incomplete."
          action={
            <Link href="/app/analyses" className={buttonClass.secondary}>
              Back to analyses
            </Link>
          }
        />
      </>
    );
  }

  return <Detail analysis={analysis} back={back} />;
}

function Detail({ analysis, back }: { analysis: AnalysisView; back: ReactNode }) {
  const [section, setSection] = useState<Section>("overview");
  const { kind } = headline(analysis);
  const signals = signalsToCards(analysis.layer1);
  const plan = analysis.assessment?.actionPlan ?? [];
  const domainLabel = (key: string) => analysis.assessment?.domains.find(domain => domain.key === key)?.label ?? key;

  return (
    <>
      <div className="mb-4">{back}</div>
      <PageHeader
        eyebrow="Analysis"
        title={analysis.domain}
        description={`${kind} · saved ${formatDate(analysis.claimedAt)}`}
        actions={
          <>
            <Link href="/quote" className={buttonClass.secondary}>
              <RotateCw aria-hidden className="h-4 w-4" />
              Re-run
            </Link>
            <button type="button" disabled className={buttonClass.secondary}>
              <Download aria-hidden className="h-4 w-4" />
              Download report
              <Badge>Coming soon</Badge>
            </button>
          </>
        }
      />

      <Tabs<Section>
        label="Analysis sections"
        active={section}
        onChange={setSection}
        items={[
          { key: "overview", label: "Overview" },
          { key: "signals", label: "Signals", count: signals.length },
          { key: "plan", label: "Action plan", count: plan.length },
          { key: "history", label: "History" },
        ]}
        panel={
          section === "overview" ? (
            <AnalysisCard analysis={analysis} />
          ) : section === "signals" ? (
            signals.length > 0 ? (
              <ul aria-label="Detected signals" className="grid gap-3 md:grid-cols-2">
                {signals.map(signal => (
                  <li key={signal.id}>
                    <SignalCard signal={signal} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileSearch} title="No signals to show" description="The scan could not evaluate any rule clearly enough to describe it." />
            )
          ) : section === "plan" ? (
            plan.length > 0 ? (
              <Card
                title="Recommended actions"
                description="From this analysis's assessment. Points are from the demo scoring model."
                actions={
                  <Link href="/app/action-plan" className="text-sm font-semibold underline-offset-4 hover:underline">
                    Track them in the action plan
                  </Link>
                }
              >
                {/* Not named "Action plan": that list name belongs to AnalysisCard, on the Overview tab. */}
                <ol aria-label="Recommended actions" className="divide-y divide-marino/10">
                  {plan.map(item => (
                    <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-sm text-marino/70">{item.detail}</p>
                        <p className="mt-1 text-xs text-marino/55">{domainLabel(item.domain)}</p>
                      </div>
                      <Badge tone="info">up to +{item.pointsGain} demo points</Badge>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : (
              <EmptyState
                icon={ListChecks}
                title={analysis.assessment ? "No actions recommended" : "No assessment yet"}
                description={
                  analysis.assessment
                    ? "The assessment did not recommend any action for this firm."
                    : "A scan alone does not produce actions. Complete the assessment to get them."
                }
                action={
                  !analysis.assessment && (
                    <Link href="/quote" className={buttonClass.primary}>
                      Run a scan and assessment
                    </Link>
                  )
                }
              />
            )
          ) : (
            <Card
              title="Score history"
              description="Monthly re-scans will show how the score moves as the firm changes."
              sample="illustrative"
            >
              <Sparkline points={SAMPLE_SCORE_HISTORY} label="Score over the last six months (sample)" />
              <ol aria-label="Re-scan timeline" className="mt-5 space-y-3 border-l border-marino/15 pl-4">
                {[...SAMPLE_SCORE_HISTORY].reverse().map(point => (
                  <li key={point.label} className="text-sm">
                    <span className="font-semibold">{point.label}</span> · Monthly re-scan · score {point.value}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-marino/60">Illustrative: not this analysis&apos;s real history.</p>
            </Card>
          )
        }
      />
    </>
  );
}
