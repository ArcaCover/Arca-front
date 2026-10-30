"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, ClipboardCheck, Plus, Sparkles } from "lucide-react";
import type { AnalysisView } from "@arca/contracts";

import { useSample } from "@/components/app/SampleState";
import { SampleGate } from "@/components/app/shell/OrgNotices";
import { useAnalyses } from "@/components/app/useAnalyses";
import {
  Badge, Card, Dialog, PageHeader, Progress, SampleBadge, StatCard, buttonClass, formatDate, inputClass, usePreview,
} from "@/components/app/ui";
import { ACTION_STATUSES, type ActionStatus, type SampleAction } from "@/lib/app/mock/actions";
import { SAMPLE_TEAM } from "@/lib/app/mock/team";

type Local = Record<string, { status: ActionStatus; assignee: string | null }>;

const ANYONE = "__anyone";
const UNASSIGNED = "__unassigned";
const ALL_DOMAINS = "__all";

const SECTION_LIST: Record<ActionStatus, string> = {
  todo: "Actions to do",
  in_progress: "Actions in progress",
  done: "Actions done",
};

/** The real assessment's actions, in the page's shape. Its domain labels come from the same assessment. */
function fromAssessment(analyses: AnalysisView[] | null): SampleAction[] {
  const assessment = analyses?.find(analysis => analysis.assessment)?.assessment;
  if (!assessment) return [];
  return assessment.actionPlan.map(item => ({
    id: `assessment_${assessment.assessmentId}_${item.id}`,
    title: item.title,
    detail: item.detail,
    domain: assessment.domains.find(domain => domain.key === item.domain)?.label ?? item.domain,
    points: item.pointsGain,
    status: "todo",
    assignee: null,
    due: null,
    sample: false,
  }));
}

function ActionPlan() {
  const { actions, dispatch } = useSample();
  const { analyses, error } = useAnalyses();
  // SampleState only holds the preview's own actions, so the assessment's statuses live here, as long as the page does.
  const [local, setLocal] = useState<Local>({});
  const [domain, setDomain] = useState(ALL_DOMAINS);
  const [assignee, setAssignee] = useState(ANYONE);
  const [adding, setAdding] = useState(false);
  const preview = usePreview();

  const real = useMemo(() => fromAssessment(analyses), [analyses]);
  const all = useMemo(
    () => [...real.map(item => ({ ...item, ...local[item.id] })), ...actions],
    [real, local, actions],
  );
  const domains = useMemo(() => [...new Set(all.map(item => item.domain))].sort(), [all]);
  const visible = all.filter(
    item =>
      (domain === ALL_DOMAINS || item.domain === domain) &&
      (assignee === ANYONE || (assignee === UNASSIGNED ? item.assignee === null : item.assignee === assignee)),
  );

  const done = all.filter(item => item.status === "done").length;
  const potential = all.filter(item => item.status !== "done").reduce((sum, item) => sum + item.points, 0);

  function update(item: SampleAction, change: { status?: ActionStatus; assignee?: string | null }) {
    if (item.sample) {
      if (change.status) dispatch({ type: "action.status", id: item.id, status: change.status });
      if (change.assignee !== undefined) dispatch({ type: "action.assignee", id: item.id, assignee: change.assignee });
      return;
    }
    setLocal(current => ({
      ...current,
      // item already carries its local values (see `all`), so it is the base to change.
      [item.id]: { status: item.status, assignee: item.assignee, ...change },
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setAdding(false);
    preview("Your own actions can be added once the action plan is saved to your organization.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Action plan"
        description="What to change in your practice, who owns it and when it is due. Each action raises your score."
        actions={
          <button type="button" onClick={() => setAdding(true)} className={buttonClass.primary}>
            <Plus aria-hidden className="h-4 w-4" />
            Add an action
          </button>
        }
      />
      {error && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}
      <p className="mb-6 rounded-2xl bg-bruma p-4 text-sm">
        Changes here are kept only in this browser tab: statuses and owners reset when you reload the page.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-marino/10 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-bruma text-marino">
              <ClipboardCheck aria-hidden className="h-4 w-4" />
            </span>
            <SampleBadge />
          </div>
          <Progress value={all.length ? (done / all.length) * 100 : 0} label="Action plan progress" />
          <p className="mt-3 text-xs text-marino/60">
            {done} of {all.length} actions done
          </p>
        </div>
        <StatCard icon={Sparkles} label="Potential points" value={`+${potential}`} hint="If every open action is done" />
        <StatCard icon={CheckCircle2} label="Done" value={done} hint={`${all.length - done} still open`} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="font-semibold">Filter by domain</span>
          <select value={domain} onChange={event => setDomain(event.target.value)} className={inputClass}>
            <option value={ALL_DOMAINS}>All domains</option>
            {domains.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-semibold">Filter by assignee</span>
          <select value={assignee} onChange={event => setAssignee(event.target.value)} className={inputClass}>
            <option value={ANYONE}>Anyone</option>
            <option value={UNASSIGNED}>Unassigned</option>
            {SAMPLE_TEAM.map(person => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        {analyses === null && !error && (
          <p role="status" className="text-sm text-marino/70">
            Loading your assessment…
          </p>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {ACTION_STATUSES.map(section => {
          const items = visible.filter(item => item.status === section.key);
          return (
            <Card key={section.key} title={`${section.label} (${items.length})`}>
              {items.length === 0 ? (
                <p className="text-sm text-marino/70">Nothing here with these filters.</p>
              ) : (
                <ul aria-label={SECTION_LIST[section.key]} className="divide-y divide-marino/10">
                  {items.map(item => (
                    <ActionRow key={item.id} item={item} onChange={change => update(item, change)} />
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add an action"
        description="Track a change your firm decided on, next to the ones from your assessment."
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="font-semibold">Title</span>
            <input required className={inputClass} />
          </label>
          <label className="block">
            <span className="font-semibold">Domain</span>
            <select className={inputClass} defaultValue={domains[0]}>
              {domains.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-semibold">Due date</span>
            <input type="date" className={inputClass} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAdding(false)} className={buttonClass.secondary}>
              Cancel
            </button>
            <button type="submit" className={buttonClass.primary}>
              Add action
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function ActionRow({
  item, onChange,
}: { item: SampleAction; onChange: (change: { status?: ActionStatus; assignee?: string | null }) => void }) {
  return (
    <li className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-semibold ${item.status === "done" ? "text-marino/60 line-through" : ""}`}>{item.title}</h3>
          <Badge tone="info">{item.domain}</Badge>
          {item.sample ? <SampleBadge /> : <Badge tone="success">From your assessment</Badge>}
        </div>
        <p className="mt-1 text-sm text-marino/70">{item.detail}</p>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-marino/60">
          {/* The assessment's points come from the demo scoring model, and AnalysisCard says so too. */}
          <span className="font-semibold text-marino">+{item.points} {item.sample ? "pts" : "demo pts"}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            {item.due ? `Due ${formatDate(item.due)}` : "No due date"}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-3 md:w-80 md:flex-nowrap">
        <label className="min-w-0 flex-1 text-xs">
          <span className="font-semibold text-marino/70">Assignee</span>
          <select
            aria-label={`Assignee for “${item.title}”`}
            value={item.assignee ?? UNASSIGNED}
            onChange={event => onChange({ assignee: event.target.value === UNASSIGNED ? null : event.target.value })}
            className={inputClass}
          >
            <option value={UNASSIGNED}>Unassigned</option>
            {SAMPLE_TEAM.map(person => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs">
          <span className="font-semibold text-marino/70">Status</span>
          <select
            aria-label={`Status for “${item.title}”`}
            value={item.status}
            onChange={event => onChange({ status: event.target.value as ActionStatus })}
            className={inputClass}
          >
            {ACTION_STATUSES.map(status => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  );
}

export default function ActionPlanPage() {
  return (
    <SampleGate feature="the action plan">
      <ActionPlan />
    </SampleGate>
  );
}
