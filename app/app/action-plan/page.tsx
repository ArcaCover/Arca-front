"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardCheck, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  ACTION_STATUSES, DOMAIN_LABELS, can, type ActionItemView, type ActionStatus, type MemberView, type UpdateActionRequest,
} from "@arca/contracts";

import { useActions } from "@/components/app/ActionsState";
import { useApp, useFailure } from "@/components/app/AppContext";
import { NewActionDialog } from "@/components/app/NewActionDialog";
import {
  Badge, Card, Dialog, LockedState, PageHeader, Progress, ReadOnlyNotice, StatCard, buttonClass, formatDate, inputClass,
  useToast,
} from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { useAccess, useCan } from "@/lib/app/access";
import { deleteAction, listMembers, updateAction } from "@/lib/app/client";
import { ACTION_STATUS_LABEL } from "@/lib/app/labels";

const SECTION_LIST: Record<ActionStatus, string> = {
  todo: "Actions to do",
  in_progress: "Actions in progress",
  done: "Actions done",
};

const ANYONE = "__anyone";
const UNASSIGNED = "__unassigned";
const ALL_DOMAINS = "__all";
const NO_DOMAIN = "__none";

const domainOf = (item: ActionItemView) => item.domain ?? NO_DOMAIN;
const domainName = (key: string) => (key === NO_DOMAIN ? "No domain" : DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS] ?? key);

// What the page says about a plan it could not read. A 402 or a refused session says nothing: useFailure moves the page on.
function loadMessage(cause: unknown): string | null {
  if (cause instanceof ApiError && (cause.code === "payment_required" || cause.code === "unauthorized")) return null;
  return cause instanceof ApiError ? cause.message : "We could not load the action plan. Please try again.";
}

/**
 * The members an action can be assigned to: only those who can mark it (DN-11 D11). Asked only by a role that assigns.
 * Null until they arrive.
 */
function useAssignees(enabled: boolean): { assignees: MemberView[] | null; error: string | null } {
  const { org } = useApp();
  const fail = useFailure();
  const [members, setMembers] = useState<MemberView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    listMembers(org.id)
      .then(list => {
        if (!cancelled) setMembers(list.members.filter(member => can(member.role, "actions.update")));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(fail(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, org.id, fail]);

  return { assignees: enabled ? members : null, error: enabled ? error : null };
}

function ActionPlan({ adding, closeAdding }: { adding: boolean; closeAdding: () => void }) {
  const { org, me } = useApp();
  const { items, source, error: planError, refresh } = useActions();
  const access = useAccess();
  const canMark = access.can("actions.update");
  const canAssign = access.can("actions.assign");
  const { assignees, error: membersError } = useAssignees(canAssign);
  const fail = useFailure();
  const notify = useToast();
  const [error, setError] = useState<string | null>(null);
  // The actions with a write on its way. Each row waits for its own, so a change to one row leaves the others usable.
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [domain, setDomain] = useState(ALL_DOMAINS);
  const [assignee, setAssignee] = useState(ANYONE);
  const [deleting, setDeleting] = useState<ActionItemView | null>(null);
  // Stable, so the dialog keeps the focus while the page re-renders under it.
  const closeDeleting = useCallback(() => setDeleting(null), []);
  // The action whose Status select takes the focus once its row is mounted in the list of its new status.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const statusFocused = useCallback(() => setFocusKey(null), []);
  // What the back answered since the plan was last read, so a change shows at once instead of snapping back while the
  // plan is read again. It holds only for the plan it was made on: the next read replaces it.
  const [local, setLocal] = useState<{ base: ActionItemView[]; list: ActionItemView[] } | null>(null);
  // The plan as last read. A write that lands after the plan was read again while it was on its way builds on that read,
  // not on the one its row was rendered from, or its change would not show until the next read.
  const latest = useRef(items);
  useLayoutEffect(() => {
    latest.current = items;
  }, [items]);

  // The provider never redirects; on this page a 402 goes to billing and a refused session to the login, as in DN-10.
  useEffect(() => {
    if (planError) fail(planError);
  }, [planError, fail]);

  const all = useMemo(() => (local && local.base === items ? local.list : items) ?? [], [local, items]);

  function settle(change: (list: ActionItemView[]) => ActionItemView[]) {
    const base = latest.current;
    if (base) setLocal(current => ({ base, list: change(current && current.base === base ? current.list : base) }));
    refresh();
  }

  async function run(key: string, action: () => Promise<void>): Promise<boolean> {
    setError(null);
    setPending(current => new Set(current).add(key));
    try {
      await action();
      return true;
    } catch (cause) {
      // The back is the one that denies: a 403 (the debug switch shows what the role lacks) or a 429 is said here.
      setError(fail(cause));
      // A 404 is a key the plan no longer has: a newer analysis brought a new plan (D14), or the action was deleted.
      // The plan is read again, so the page stops offering it.
      if (cause instanceof ApiError && cause.code === "not_found") refresh();
      return false;
    } finally {
      setPending(current => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  const change = (item: ActionItemView, patch: UpdateActionRequest) =>
    run(item.key, async () => {
      const updated = await updateAction(org.id, item.key, patch);
      // A new status moves the row to another list, where React mounts it anew. The focus follows it there instead of
      // dropping to the page, unless the user has taken it elsewhere meanwhile.
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (patch.status && focused?.dataset.statusKey === item.key) setFocusKey(item.key);
      settle(list => list.map(entry => (entry.key === updated.key ? updated : entry)));
      if (patch.status) notify(`“${updated.title}” moved to ${ACTION_STATUS_LABEL[updated.status]}.`);
    });

  async function remove(item: ActionItemView) {
    const removed = await run(item.key, async () => {
      await deleteAction(org.id, item.key);
      settle(list => list.filter(entry => entry.key !== item.key));
    });
    if (removed) {
      setDeleting(null);
      notify("Action deleted.");
    }
  }

  const domains = useMemo(() => [...new Set(all.map(domainOf))], [all]);
  const people = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of all) if (item.assignee) seen.set(item.assignee.userId, item.assignee.email);
    return [...seen].sort(([, a], [, b]) => a.localeCompare(b));
  }, [all]);
  const visible = all.filter(
    item =>
      (domain === ALL_DOMAINS || domainOf(item) === domain) &&
      (assignee === ANYONE || (assignee === UNASSIGNED ? item.assignee === null : item.assignee?.userId === assignee)),
  );

  const done = all.filter(item => item.status === "done").length;
  const atStake = all.reduce((sum, item) => sum + (item.status !== "done" && item.pointsGain ? item.pointsGain : 0), 0);
  const failure = items === null && planError ? loadMessage(planError) : null;
  // A read that failed after a write keeps the last plan on screen, and says it may be out of date.
  const stale = items !== null && planError ? loadMessage(planError) : null;

  // A read-only part says once, at the top, who can make the change (DN-11 §6.1).
  const readOnly = !canMark
    ? "Your role can read the plan. Ask an owner, admin or member to update an action."
    : !canAssign
      ? "You can change the status of any action. Ask an owner or admin to assign one, set a due date or add an action."
      : null;

  return (
    <>
      {readOnly && <ReadOnlyNotice>{readOnly}</ReadOnlyNotice>}
      {/* While the delete dialog is open it says the error itself, over the page. */}
      {error && !deleting && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}
      {membersError && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {membersError}
        </p>
      )}
      {/* D16: the plan tracks the work; only a new analysis scores it. */}
      <p className="mb-6 rounded-2xl bg-bruma p-4 text-sm">
        Marking an action done doesn&apos;t change your score: the plan tracks the work. A new analysis updates the score.
      </p>
      {stale && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-rojo">
            {stale} The plan shown may be out of date.
          </p>
          <button type="button" onClick={refresh} className={buttonClass.secondary}>
            Try again
          </button>
        </div>
      )}

      {items === null ? (
        failure ? (
          <div className="rounded-3xl border border-marino/10 bg-white p-6">
            <p role="alert" className="text-sm text-rojo">
              {failure}
            </p>
            <button type="button" onClick={refresh} className={`${buttonClass.secondary} mt-4`}>
              Try again
            </button>
          </div>
        ) : (
          !planError && (
            <p role="status" className="rounded-3xl border border-marino/10 bg-white p-6 text-sm text-marino/70">
              Loading the action plan…
            </p>
          )
        )
      ) : (
        <>
          <p className="mb-6 text-sm text-marino/70">
            {source ? (
              <>
                Recommended by your analysis of {source.domain}, saved {formatDate(source.claimedAt)}.{" "}
                <Link href={`/app/analyses/${source.scanId}`} className="font-semibold underline">
                  View analysis
                </Link>
              </>
            ) : (
              "No analysis with a completed assessment yet, so the plan lists only your organization's own actions."
            )}
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-marino/10 bg-white p-5">
              <span className="mb-4 grid h-9 w-9 place-items-center rounded-2xl bg-bruma text-marino">
                <ClipboardCheck aria-hidden className="h-4 w-4" />
              </span>
              <Progress value={all.length ? (done / all.length) * 100 : 0} label="Action plan progress" />
              <p className="mt-3 text-xs text-marino/60">
                {done} of {all.length} actions done
              </p>
            </div>
            {/* The demo model estimates each action's gain alone, with every other answer held fixed, and never estimated
                them together: the total is this page's sum, and says so. */}
            <StatCard
              icon={Sparkles}
              sample={false}
              label="Demo points still open"
              value={`+${Math.round(atStake * 10) / 10}`}
              hint="Each open action's own demo estimate, added up. They were not estimated together."
            />
            <StatCard icon={CheckCircle2} sample={false} label="Done" value={done} hint={`${all.length - done} still open`} />
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <span className="font-semibold">Filter by domain</span>
              <select value={domain} onChange={event => setDomain(event.target.value)} className={inputClass}>
                <option value={ALL_DOMAINS}>All domains</option>
                {domains.map(key => (
                  <option key={key} value={key}>
                    {domainName(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-semibold">Filter by assignee</span>
              <select value={assignee} onChange={event => setAssignee(event.target.value)} className={inputClass}>
                <option value={ANYONE}>Anyone</option>
                <option value={UNASSIGNED}>Unassigned</option>
                {people.map(([userId, email]) => (
                  <option key={userId} value={userId}>
                    {userId === me.user.id ? `${email} (you)` : email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 space-y-6">
            {ACTION_STATUSES.map(status => {
              const list = visible.filter(item => item.status === status);
              return (
                <Card key={status} title={`${ACTION_STATUS_LABEL[status]} (${list.length})`}>
                  {list.length === 0 ? (
                    <p className="text-sm text-marino/70">
                      {all.length === 0 ? "No actions yet." : "Nothing here with these filters."}
                    </p>
                  ) : (
                    <ul aria-label={SECTION_LIST[status]} className="divide-y divide-marino/10">
                      {list.map(item => (
                        <ActionRow
                          key={item.key}
                          item={item}
                          me={me.user.id}
                          canMark={canMark}
                          canAssign={canAssign}
                          assignees={assignees}
                          busy={pending.has(item.key)}
                          focusStatus={focusKey === item.key}
                          onStatusFocused={statusFocused}
                          onChange={patch => change(item, patch)}
                          onDelete={() => {
                            setError(null);
                            setDeleting(item);
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <NewActionDialog
        open={adding}
        onClose={closeAdding}
        onCreated={created => {
          closeAdding();
          settle(list => [...list, created]);
          notify("Action added to the plan.");
        }}
      />

      <Dialog
        open={deleting !== null}
        onClose={closeDeleting}
        title="Delete this action?"
        description={deleting && `“${deleting.title}” leaves the plan for everyone in ${org.name}.`}
        footer={
          deleting && (
            <>
              <button type="button" onClick={closeDeleting} className={buttonClass.secondary}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending.has(deleting.key)}
                onClick={() => void remove(deleting)}
                className={buttonClass.danger}
              >
                Delete action
              </button>
            </>
          )
        }
      >
        {error && (
          <p role="alert" className="text-sm text-rojo">
            {error}
          </p>
        )}
        <p>Only your organization&apos;s own actions can be deleted. The assessment&apos;s stay, and only change status.</p>
      </Dialog>
    </>
  );
}

function ActionRow({
  item, me, canMark, canAssign, assignees, busy, focusStatus, onStatusFocused, onChange, onDelete,
}: {
  item: ActionItemView;
  me: string;
  canMark: boolean;
  canAssign: boolean;
  assignees: MemberView[] | null;
  busy: boolean;
  /** Whether the Status select takes the focus: the row was just moved to this list by a change made from it. */
  focusStatus: boolean;
  onStatusFocused: () => void;
  /** Resolves to whether the back took the change. */
  onChange: (patch: UpdateActionRequest) => Promise<boolean>;
  onDelete: () => void;
}) {
  const statusSelect = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!focusStatus) return;
    statusSelect.current?.focus();
    onStatusFocused();
  }, [focusStatus, onStatusFocused]);

  const label = `“${item.title}”`;
  const owner = item.assignee ? (item.assignee.userId === me ? `${item.assignee.email} (you)` : item.assignee.email) : null;
  // The current assignee stays listed even if they could no longer be picked, so the control never misstates the row.
  const options = (assignees ?? []).map(({ userId, email }) => ({ userId, email }));
  if (item.assignee && !options.some(member => member.userId === item.assignee?.userId)) options.unshift(item.assignee);

  return (
    <li className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-semibold ${item.status === "done" ? "text-marino/60 line-through" : ""}`}>{item.title}</h3>
          {item.domain && <Badge tone="info">{DOMAIN_LABELS[item.domain]}</Badge>}
          {item.source === "assessment" ? <Badge tone="success">From your assessment</Badge> : <Badge>Added by your team</Badge>}
        </div>
        {item.detail && <p className="mt-1 text-sm text-marino/70">{item.detail}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-marino/60">
          {item.pointsGain !== null && <span className="font-semibold text-marino">+{item.pointsGain} demo pts</span>}
          {!canAssign && (
            <>
              <span>{owner ? `Assigned to ${owner}` : "Unassigned"}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden className="h-3.5 w-3.5" />
                {item.dueDate ? `Due ${formatDate(item.dueDate)}` : "No due date"}
              </span>
            </>
          )}
          {item.updatedAt && <span>Updated {formatDate(item.updatedAt)}</span>}
        </p>
      </div>
      {/* Four controls take a wide column; the status alone, a narrow one, so the action's text keeps the room. */}
      {(canMark || canAssign) && (
        <div className={`flex flex-wrap items-end gap-3 md:flex-nowrap ${canAssign ? "md:w-[26rem]" : "md:w-44"}`}>
          {canAssign && (
            <>
              <label className="min-w-0 flex-1 text-xs">
                <span className="font-semibold text-marino/70">Assignee</span>
                {/* Inert while the row's write is on its way, as the status below is. */}
                <select
                  aria-label={`Assignee for ${label}`}
                  value={item.assignee?.userId ?? UNASSIGNED}
                  disabled={assignees === null}
                  aria-disabled={busy || undefined}
                  onChange={event => {
                    if (!busy) void onChange({ assigneeUserId: event.target.value === UNASSIGNED ? null : event.target.value });
                  }}
                  className={inputClass}
                >
                  <option value={UNASSIGNED}>Unassigned</option>
                  {options.map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.userId === me ? `${member.email} (you)` : member.email}
                    </option>
                  ))}
                </select>
              </label>
              {/* Keyed by the saved date, so a new value from the back starts the field over. */}
              <DueDate
                key={item.dueDate ?? ""}
                label={`Due date for ${label}`}
                saved={item.dueDate}
                disabled={busy}
                onSave={dueDate => onChange({ dueDate })}
              />
            </>
          )}
          {canMark && (
            <label className="min-w-0 flex-1 text-xs">
              <span className="font-semibold text-marino/70">Status</span>
              {/* Inert rather than disabled while the row's write is on its way, so the focus stays on it: a change made
                  meanwhile is ignored, and the select shows the saved status again. */}
              <select
                ref={statusSelect}
                aria-label={`Status for ${label}`}
                value={item.status}
                aria-disabled={busy || undefined}
                data-status-key={item.key}
                onChange={event => {
                  if (!busy) void onChange({ status: event.target.value as ActionStatus });
                }}
                className={inputClass}
              >
                {ACTION_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {ACTION_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canAssign && item.source === "custom" && (
            <button
              type="button"
              aria-label={`Delete ${label}`}
              disabled={busy}
              onClick={onDelete}
              className={buttonClass.ghost}
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * A due date, saved when the field is left (Enter leaves it too). Saving on every change would write a date per digit
 * typed in the year (0002, 0020, 0202, 2026), and each write counts against the back's limit and lands in its audit.
 */
function DueDate({
  label, saved, disabled, onSave,
}: { label: string; saved: string | null; disabled: boolean; onSave: (dueDate: string | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(saved ?? "");
  // Bumped to mount a new field. With no saved date the value is "" before and after, so React would write nothing and
  // the browser would keep showing the half-typed parts.
  const [field, setField] = useState(0);
  async function commit(input: HTMLInputElement) {
    // Switching to another window or tab blurs the field too, but it stays the page's active element: the user has not
    // left it, so the typed parts and the focus stay, and a year still being typed (0020) is not saved.
    if (document.activeElement === input) return;
    // A partly edited date reads as "" too. Only a field really emptied clears the date; a half-typed one goes back to
    // the saved date instead of removing it.
    if (draft === "" && input.validity.badInput) {
      setDraft(saved ?? "");
      setField(current => current + 1);
      return;
    }
    if (draft === (saved ?? "")) return;
    // A refused change puts the saved date back, so the field never shows a date the plan does not have.
    if (!(await onSave(draft || null))) setDraft(saved ?? "");
  }
  return (
    <label className="min-w-0 flex-1 text-xs">
      <span className="font-semibold text-marino/70">Due date</span>
      <input
        key={field}
        type="date"
        aria-label={label}
        value={draft}
        disabled={disabled}
        onChange={event => setDraft(event.target.value)}
        onBlur={event => void commit(event.currentTarget)}
        onKeyDown={event => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={inputClass}
      />
    </label>
  );
}

export default function ActionPlanPage() {
  const { org } = useApp();
  const canChoosePlan = useCan("billing.manage");
  const canAssign = useCan("actions.assign");
  const [adding, setAdding] = useState(false);
  // Stable, so the dialog keeps the focus while the page re-renders under it.
  const closeAdding = useCallback(() => setAdding(false), []);
  // The title stays over the locked state too, so the page keeps its h1 (as Coverage and Documents do). The plan is read
  // only for a paid organization (the back answers 402 otherwise), so an unpaid one sees the locked state and the page
  // asks nothing.
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Action plan"
        description="What to change in your practice, who owns it and when it is due."
        actions={
          org.paidAccess &&
          canAssign && (
            <button type="button" onClick={() => setAdding(true)} className={buttonClass.primary}>
              <Plus aria-hidden className="h-4 w-4" />
              Add an action
            </button>
          )
        }
      />
      {org.paidAccess ? (
        <ActionPlan adding={adding} closeAdding={closeAdding} />
      ) : (
        <LockedState feature="the action plan" canChoosePlan={canChoosePlan} />
      )}
    </>
  );
}
