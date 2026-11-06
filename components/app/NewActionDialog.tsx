"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { DOMAIN_LABELS, DomainKey, type ActionItemView } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { Dialog, buttonClass, inputClass } from "@/components/app/ui";
import { createAction } from "@/lib/app/client";

const NO_DOMAIN = "__none";

/**
 * The form that adds one of the organization's own actions (actions.assign), used by the action plan and by Monitoring's
 * Create action (DN-11 D17). It saves for real and hands the new action back; the caller reads the plan again.
 */
export function NewActionDialog({
  open, onClose, onCreated, title = "", description,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (action: ActionItemView) => void;
  /** What the title starts with, such as an alert's suggested action. */
  title?: string;
  description?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add an action"
      description={description ?? "Track a change your firm decided on, next to the ones from your assessment."}
    >
      {/* Mounted only while open, so every opening starts from the given title. */}
      <NewActionForm initialTitle={title} onCancel={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function NewActionForm({
  initialTitle, onCancel, onCreated,
}: { initialTitle: string; onCancel: () => void; onCreated: (action: ActionItemView) => void }) {
  const { org } = useApp();
  const fail = useFailure();
  const [title, setTitle] = useState(initialTitle);
  const [detail, setDetail] = useState("");
  const [domain, setDomain] = useState<string>(NO_DOMAIN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createAction(org.id, {
        title: title.trim(),
        ...(detail.trim() ? { detail: detail.trim() } : {}),
        ...(domain === NO_DOMAIN ? {} : { domain: domain as DomainKey }),
      });
      onCreated(created);
    } catch (cause) {
      // The back is the one that denies: a 403 or a 429 is said here, inside the form the user is still looking at.
      setError(fail(cause));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-rojo">
          {error}
        </p>
      )}
      <label className="block">
        <span className="font-semibold">Title</span>
        <input
          required
          maxLength={200}
          value={title}
          onChange={event => setTitle(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="font-semibold">Details</span>
        <span className="ml-1 text-marino/60">(optional)</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={detail}
          onChange={event => setDetail(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="font-semibold">Domain</span>
        <select value={domain} onChange={event => setDomain(event.target.value)} className={inputClass}>
          <option value={NO_DOMAIN}>No domain</option>
          {DomainKey.options.map(key => (
            <option key={key} value={key}>
              {DOMAIN_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={buttonClass.secondary}>
          Cancel
        </button>
        <button type="submit" disabled={saving || title.trim() === ""} className={buttonClass.primary}>
          {saving ? "Adding…" : "Add action"}
        </button>
      </div>
    </form>
  );
}
