import Link from "next/link";
import { ArrowLeft, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { AssessmentView } from "@arca/contracts";
import { ArcaWordmark } from "@/components/brand/ArcaWordmark";

export function DemoNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-oro/50 bg-oro/10 px-4 py-3 text-xs leading-relaxed text-marino">
      <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong className="font-semibold">Demo assessment.</strong> Questions
        and scoring use provisional business rules. Results are illustrative,
        with no coverage offer, pricing, or underwriting decision.
      </p>
    </div>
  );
}

export function AssessmentOrb({ loading = false }: { loading?: boolean }) {
  return (
    <div
      className={`assessment-orb ${loading ? "assessment-orb-loading" : ""}`}
      aria-hidden
    >
      <div className="assessment-orb-core" />
      <span className="assessment-orb-ring" />
      <span className="assessment-orb-ring assessment-orb-ring-outer" />
      <span className="assessment-orb-glint" />
    </div>
  );
}

export default function AssessmentShell({
  children,
  scanId,
  view,
  title = "A clearer picture starts with you.",
  description = "Your public footprint is just the beginning. Help us understand how your team works with AI.",
  results = false,
}: {
  children: ReactNode;
  scanId?: string | null;
  view?: AssessmentView | null;
  title?: string;
  description?: string;
  results?: boolean;
}) {
  const domains = view
    ? [
        ...new Map(
          view.questions.map((question) => [
            question.domain,
            question.domainLabel,
          ]),
        ).entries(),
      ]
    : [];
  return (
    <div className="assessment-canvas min-h-screen">
      <div className="relative mx-auto max-w-[1240px] px-5 py-6 sm:px-8 lg:px-12 lg:py-9">
        <header className="flex items-center justify-between gap-4">
          <Link
            href={
              scanId ? `/score?scan=${encodeURIComponent(scanId)}` : "/quote"
            }
            aria-label="Arca, back to scan"
            className="rounded focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-marino"
          >
            <ArcaWordmark className="h-7 w-auto text-marino" />
          </Link>
          <span className="flex items-center gap-2 rounded-full border border-marino/10 bg-white/70 px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-marino/75">
            <span className="h-1.5 w-1.5 rounded-full bg-cielo" /> DEMO
            WORKSPACE
          </span>
        </header>
        <nav
          aria-label="Assessment stages"
          className="mt-8 flex items-center gap-2 text-[11px] sm:gap-4 sm:text-xs"
        >
          <span className="flex items-center gap-1.5 text-marino/70">
            <Check aria-hidden className="h-3.5 w-3.5" /> Quick scan
          </span>
          <span aria-hidden className="h-px w-5 bg-marino/15 sm:w-9" />
          <span
            aria-current={!results ? "step" : undefined}
            className={
              !results ? "font-semibold text-marino" : "text-marino/70"
            }
          >
            02 · Deep assessment
          </span>
          <span aria-hidden className="h-px w-5 bg-marino/15 sm:w-9" />
          <span
            aria-current={results ? "step" : undefined}
            className={results ? "font-semibold text-marino" : "text-marino/70"}
          >
            03 · Your outlook
          </span>
        </nav>
        <div className="mt-10 grid items-start gap-8 lg:mt-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <aside className="lg:sticky lg:top-10">
            <div className="hidden lg:block">
              <AssessmentOrb />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-marino/70 lg:mt-9">
              {results ? "Your next chapter" : "The deep assessment"}
            </p>
            <h1 className="mt-3 max-w-[390px] font-heading text-[32px] font-medium leading-[1.12] tracking-[-0.045em] text-marino sm:text-[40px] lg:text-[46px]">
              {title}
            </h1>
            <p className="mt-4 max-w-[350px] text-sm leading-7 text-marino/70 sm:text-[15px]">
              {description}
            </p>
            {domains.length > 0 && (
              <div
                className="mt-8 hidden space-y-3.5 lg:block"
                aria-label="Domains in this assessment"
              >
                {domains.map(([domain, label], index) => {
                  const questions = view!.questions.filter(
                    (question) => question.domain === domain,
                  );
                  const done = questions.every(
                    (question) => !!view!.answers[question.id],
                  );
                  return (
                    <div
                      key={domain}
                      className="flex items-center gap-3 text-xs text-marino/75"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${done ? "bg-marino text-white" : "border border-marino/15 bg-white/50"}`}
                      >
                        {done ? (
                          <Check aria-hidden className="h-3 w-3" />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-7 hidden max-w-[350px] items-start gap-2.5 border-t border-marino/10 pt-5 text-xs leading-6 text-marino/70 lg:flex">
              <LockKeyhole aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0" />
              <p>
                Saved answers can be resumed in this tab for up to 24 hours.
                Keep this tab open to retain access.
              </p>
            </div>
          </aside>
          <main className="min-w-0">
            <DemoNotice />
            <div className="mt-5">{children}</div>
            <p className="mt-5 flex items-start justify-center gap-2 text-center text-[11px] leading-5 text-marino/70 lg:hidden">
              <LockKeyhole aria-hidden className="mt-1 h-3 w-3 shrink-0" />
              Saved in this tab for up to 24 hours. Keep the tab open.
            </p>
          </main>
        </div>
        <footer className="mt-12 flex items-center justify-between gap-3 border-t border-marino/10 pt-5 text-[11px] text-marino/70 lg:mt-16">
          <span>© 2026 Arca · Built for a clearer tomorrow.</span>
          {scanId && (
            <Link
              href={`/score?scan=${encodeURIComponent(scanId)}`}
              className="inline-flex items-center gap-1.5 rounded hover:text-marino focus-visible:outline-2 focus-visible:outline-marino"
            >
              <ArrowLeft aria-hidden className="h-3 w-3" />
              Pre-score
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
