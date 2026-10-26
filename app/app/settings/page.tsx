"use client";

import { useState, type FormEvent } from "react";
import { can } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { requestDeletion } from "@/lib/app/client";

export default function SettingsPage() {
  const { org, reload } = useApp();
  const fail = useFailure();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  // DN-10 §5: the button follows the role, except in the debug modes, where it stays active so the demo shows the back's 403.
  const canRequest =
    process.env.NEXT_PUBLIC_ARCA_MODE === "mock" ||
    process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ||
    can(org.role, "org.request_deletion");

  // Only a request: nothing is deleted until a person at ARCA approves it (DN-10 §2).
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestDeletion(org.id, reason.trim());
      setRequested(true);
      setReason("");
      reload();
    } catch (cause) {
      setError(fail(cause));
    }
    setBusy(false);
  }

  return (
    <>
      <h1 className="font-heading text-2xl">Settings</h1>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-3xl border border-marino/10 bg-white p-6 text-sm">
        <dt className="text-marino/70">Organization</dt>
        <dd>{org.name}</dd>
        <dt className="text-marino/70">Domain</dt>
        <dd>{org.domain ?? "—"}</dd>
        <dt className="text-marino/70">Your role</dt>
        <dd>{org.role}</dd>
        <dt className="text-marino/70">Billing</dt>
        <dd>{org.billingStatus.replace("_", " ")}</dd>
      </dl>
      <h2 className="mt-8 font-heading text-lg">Request deletion</h2>
      {requested || org.deletionPending ? (
        <p role="status" className="mt-2 rounded-2xl bg-oro/20 p-4 text-sm">
          Deletion requested. It is pending review by ARCA: nothing is deleted until then, and access continues meanwhile.
        </p>
      ) : (
        <p className="mt-2 text-sm text-marino/70">A person at ARCA reviews every request. Nothing is deleted before then.</p>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm">
          Reason
          <textarea
            required
            maxLength={2000}
            value={reason}
            onChange={event => setReason(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-marino/20 bg-white px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !canRequest}
          className="rounded-full border border-rojo/40 px-5 py-2 text-sm font-semibold text-rojo disabled:opacity-60"
        >
          Request deletion
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rojo">
          {error}
        </p>
      )}
    </>
  );
}
