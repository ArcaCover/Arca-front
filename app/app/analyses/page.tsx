"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Plus, RotateCw } from "lucide-react";
import type { AnalysisView } from "@arca/contracts";

import { summary } from "@/components/app/AnalysisCard";
import { headline, useAnalyses } from "@/components/app/useAnalyses";
import { Badge, Card, EmptyState, FilterPills, PageHeader, buttonClass, formatDate, inputClass } from "@/components/app/ui";
import { DomainBar, TierBadge } from "@/components/score";

type Filter = "all" | "assessed" | "scan";
type Sort = "date" | "score";

// The bars AnalysisCard draws, without its captions: the compare panel is too narrow for them.
const bars = (analysis: AnalysisView) => summary(analysis).bars.map(({ caption: _caption, ...bar }) => bar);

export default function AnalysesPage() {
  const { analyses, error } = useAnalyses();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("date");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const list = (analyses ?? []).filter(item =>
      filter === "all" ? true : filter === "assessed" ? item.assessment !== null : item.assessment === null,
    );
    // useAnalyses already returns newest first; by score, an unscored analysis goes last.
    if (sort === "score") list.sort((a, b) => (headline(b).score ?? -1) - (headline(a).score ?? -1));
    return list;
  }, [analyses, filter, sort]);

  const assessed = analyses?.filter(item => item.assessment !== null).length ?? 0;
  const total = analyses?.length ?? 0;
  const compared = picked.map(id => analyses?.find(item => item.scanId === id)).filter((item): item is AnalysisView => !!item);

  function toggle(scanId: string) {
    setPicked(list => (list.includes(scanId) ? list.filter(id => id !== scanId) : [...list, scanId].slice(-2)));
  }

  return (
    <>
      <PageHeader
        eyebrow="Analyses"
        title="Analyses"
        description="Every scan and assessment saved to your organization, newest first."
        actions={
          <Link href="/quote" className={buttonClass.secondary}>
            <Plus aria-hidden className="h-4 w-4" />
            Run a new analysis
          </Link>
        }
      />
      {error && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}

      {analyses === null ? (
        !error && (
          <p role="status" className="rounded-3xl border border-marino/10 bg-white p-6 text-sm text-marino/70">
            Loading analyses…
          </p>
        )
      ) : analyses.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No analyses saved yet."
          description="Run a scan of your firm and save the results to your organization."
          action={
            <Link href="/quote" className={buttonClass.primary}>
              Run your first analysis
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <FilterPills
              label="Filter analyses"
              active={filter}
              onChange={setFilter}
              items={[
                { key: "all", label: "All", count: total },
                { key: "assessed", label: "With assessment", count: assessed },
                { key: "scan", label: "Scan only", count: total - assessed },
              ]}
            />
            <label className="text-xs font-semibold text-marino/70">
              Sort by
              <select value={sort} onChange={event => setSort(event.target.value as Sort)} className={`${inputClass} w-44`}>
                <option value="date">Newest first</option>
                <option value="score">Highest score</option>
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-marino/20 bg-white p-6 text-sm text-marino/70">
              No analyses match this filter.
            </p>
          ) : (
            // One table for every width: below md each row is laid out as a card. The explicit roles keep the table
            // semantics that a changed CSS display can strip.
            <table role="table" aria-label="Saved analyses" className="block w-full text-sm md:table md:rounded-3xl md:border md:border-marino/10 md:bg-white">
              <thead role="rowgroup" className="sr-only md:not-sr-only md:table-header-group">
                <tr role="row" className="text-left text-xs uppercase tracking-wide text-marino/55">
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Compare</span>
                  </th>
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">Domain</th>
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">Score</th>
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">Tier</th>
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">Saved</th>
                  <th role="columnheader" scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="block space-y-3 md:table-row-group md:space-y-0">
                {rows.map(item => {
                  const { score, tier, kind } = headline(item);
                  const checked = picked.includes(item.scanId);
                  const date = formatDate(item.claimedAt);
                  return (
                    <tr
                      key={item.scanId}
                      role="row"
                      className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-3xl border border-marino/10 bg-white p-4 md:table-row md:rounded-none md:border-0 md:border-t md:p-0"
                    >
                      <td role="cell" className="row-span-2 md:table-cell md:px-4 md:py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(item.scanId)}
                          aria-label={`Compare ${item.domain} (saved ${date})`}
                          className="h-4 w-4 accent-marino"
                        />
                      </td>
                      <td role="cell" className="font-heading font-semibold md:table-cell md:px-4 md:py-3">
                        {item.domain}
                        {item.scanStatus === "PARTIAL" && <span className="ml-2 text-xs font-normal text-marino/60">partial evidence</span>}
                      </td>
                      <td role="cell" className="col-start-2 text-marino/70 md:table-cell md:px-4 md:py-3">
                        {kind}
                      </td>
                      <td role="cell" className="col-start-2 md:table-cell md:px-4 md:py-3">
                        <span aria-hidden className="mr-2 text-xs text-marino/55 md:hidden">Score</span>
                        <span className="font-semibold tabular-nums">{score === null ? "—" : score}</span>
                      </td>
                      <td role="cell" className="col-start-2 md:table-cell md:px-4 md:py-3">
                        <TierBadge tier={tier} />
                      </td>
                      <td role="cell" className="col-start-2 text-marino/70 md:table-cell md:px-4 md:py-3">
                        <span aria-hidden className="mr-2 text-xs text-marino/55 md:hidden">Saved</span>
                        {date}
                      </td>
                      <td role="cell" className="col-span-2 md:table-cell md:px-4 md:py-3">
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <Link href={`/app/analyses/${item.scanId}`} aria-label={`View ${item.domain}`} className={buttonClass.secondary}>
                            View
                          </Link>
                          <Link href="/quote" aria-label={`Re-run ${item.domain}`} className={buttonClass.ghost}>
                            <RotateCw aria-hidden className="h-4 w-4" />
                            Re-run
                          </Link>
                          <button
                            type="button"
                            disabled
                            aria-label={`Download report for ${item.domain} (coming soon)`}
                            className={buttonClass.ghost}
                          >
                            <Download aria-hidden className="h-4 w-4" />
                            Download
                            <Badge>Coming soon</Badge>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <Card
            className="mt-6"
            title="Compare"
            description="Tick two analyses to see their scores side by side."
            actions={
              picked.length > 0 && (
                <button type="button" onClick={() => setPicked([])} className={buttonClass.ghost}>
                  Clear
                </button>
              )
            }
          >
            <div aria-live="polite">
              {compared.length < 2 ? (
                <p className="text-sm text-marino/70">
                  {compared.length === 0 ? "No analyses ticked yet." : "Tick one more analysis to compare."}
                </p>
              ) : (
                <>
                  {/* An assessment scores six domains out of 100; a scan alone, four categories with their own ceilings. */}
                  {(compared[0].assessment === null) !== (compared[1].assessment === null) && (
                    <p className="mb-4 text-xs text-marino/70">
                      One of these has an assessment and the other is a scan only, so their bars measure different things.
                    </p>
                  )}
                  <div className="grid gap-6 md:grid-cols-2">
                    {compared.map(item => {
                      const { score, tier, kind } = headline(item);
                      return (
                        <section key={item.scanId} aria-label={`${item.domain}, saved ${formatDate(item.claimedAt)}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="font-heading font-semibold">{item.domain}</h3>
                              <p className="text-xs text-marino/60">
                                {kind} · saved {formatDate(item.claimedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-heading text-2xl font-semibold tabular-nums">{score === null ? "—" : score}</span>
                              <TierBadge tier={tier} />
                            </div>
                          </div>
                          <div className="mt-4 space-y-4">
                            {bars(item).map(({ key, ...bar }) => (
                              <DomainBar key={key} {...bar} />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
