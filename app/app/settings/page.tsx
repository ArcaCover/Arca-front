"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, FolderOpen, Laptop, Scale, Smartphone } from "lucide-react";
import { can } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { Badge, Card, PageHeader, SampleBadge, buttonClass, formatDate, inputClass, usePreview } from "@/components/app/ui";
import { requestDeletion } from "@/lib/app/client";
import { SAMPLE_SESSIONS } from "@/lib/app/mock/records";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "integrations", label: "Integrations" },
  { id: "data-privacy", label: "Data & privacy" },
];

const STATES = ["California", "Florida", "New York", "Texas", "Another state"];
const PRACTICE_AREAS = [
  "Criminal defense", "Immigration", "Personal injury", "Family law", "Commercial litigation", "Employment law",
  "Corporate / M&A", "Real estate", "Tax / regulatory",
];

const NOTIFICATIONS = [
  { key: "monitoring", label: "Monitoring alerts", hint: "When a re-scan finds a change on the firm's website." },
  { key: "regulatory", label: "Rule changes", hint: "New rules about AI in legal practice in your states." },
  { key: "actions", label: "Action plan reminders", hint: "When an action assigned to you is close to its due date." },
  { key: "members", label: "Member changes", hint: "When someone joins, leaves or changes role." },
] as const;
type NotificationKey = (typeof NOTIFICATIONS)[number]["key"];

const INTEGRATIONS = [
  { name: "Practice management", hint: "Bring matters in to see where AI touches client work.", icon: Scale },
  { name: "Document storage", hint: "Link the folders that hold your policies and evidence.", icon: FolderOpen },
  { name: "Email & calendar", hint: "Receive alerts and due dates where you already work.", icon: CalendarDays },
];

export default function SettingsPage() {
  const { org, reload } = useApp();
  const fail = useFailure();
  const preview = usePreview();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  // Sample values for the local forms below: nothing here is read from or sent to the API.
  const [profile, setProfile] = useState({ state: "Florida", attorneys: "12", areas: ["Immigration", "Personal injury"] });
  const [alerts, setAlerts] = useState<Record<NotificationKey, boolean>>({
    monitoring: true, regulatory: true, actions: true, members: false,
  });
  const [digest, setDigest] = useState("weekly");

  // DN-10 §5: the button follows the role, except in the debug modes, where it stays active so the demo shows the back's 403.
  const canRequest =
    process.env.NEXT_PUBLIC_ARCA_MODE === "mock" ||
    process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ||
    can(org.role, "org.request_deletion");
  // One request at a time: a second one would only meet the back's 409, so the form closes until ARCA reviews it.
  const pending = requested || org.deletionPending;

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

  function toggleArea(area: string) {
    setProfile(current => ({
      ...current,
      areas: current.areas.includes(area) ? current.areas.filter(item => item !== area) : [...current.areas, area],
    }));
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    preview("The firm profile will be saved once settings are connected.");
  }

  return (
    <>
      <PageHeader eyebrow="Organization" title="Settings" description="Your organization's details, notifications, security and data." />

      <div className="grid gap-6 lg:grid-cols-[11rem_1fr]">
        {/* One element for every width: a scrolling row on small screens, a sticky column on large ones. */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {SECTIONS.map(section => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-marino/70 hover:bg-marino/5 hover:text-marino"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <div id="general" className="scroll-mt-24 space-y-6">
            <Card title="General" description="As ARCA has your organization on record.">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-marino/70">Organization</dt>
                <dd>{org.name}</dd>
                <dt className="text-marino/70">Domain</dt>
                <dd>{org.domain ?? "—"}</dd>
                <dt className="text-marino/70">Your role</dt>
                <dd>{org.role}</dd>
                <dt className="text-marino/70">Billing</dt>
                <dd>{org.billingStatus.replace("_", " ")}</dd>
              </dl>
            </Card>

            <Card title="Firm profile" description="What shapes the comparisons and alerts the firm sees." sample>
              <form onSubmit={saveProfile} className="space-y-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    Primary state
                    <select
                      value={profile.state}
                      onChange={event => setProfile({ ...profile, state: event.target.value })}
                      className={inputClass}
                    >
                      {STATES.map(state => (
                        <option key={state}>{state}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Number of attorneys
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={profile.attorneys}
                      onChange={event => setProfile({ ...profile, attorneys: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <fieldset>
                  <legend>Practice areas</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {PRACTICE_AREAS.map(area => (
                      <label key={area} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={profile.areas.includes(area)}
                          onChange={() => toggleArea(area)}
                          className="h-4 w-4 accent-marino"
                        />
                        {area}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button type="submit" className={buttonClass.secondary}>
                  Save
                </button>
              </form>
            </Card>
          </div>

          <div id="notifications" className="scroll-mt-24">
            <Card title="Notifications" description="Which alerts reach you by email, and how often the summary arrives." sample>
              <ul className="divide-y divide-marino/10">
                {NOTIFICATIONS.map(item => (
                  <li key={item.key} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p id={`notify-${item.key}`} className="text-sm font-semibold">
                        {item.label}
                      </p>
                      <p className="text-xs text-marino/60">{item.hint}</p>
                    </div>
                    <button
                      type="button"
                      aria-labelledby={`notify-${item.key}`}
                      aria-pressed={alerts[item.key]}
                      onClick={() => setAlerts(current => ({ ...current, [item.key]: !current[item.key] }))}
                      className="group relative h-6 w-11 shrink-0 rounded-full bg-marino/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cielo aria-pressed:bg-marino"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform group-aria-pressed:translate-x-5 motion-reduce:transition-none"
                      />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
                <label className="block">
                  Summary email
                  <select value={digest} onChange={event => setDigest(event.target.value)} className={inputClass}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="never">Never</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => preview("Notification preferences will be saved once email alerts are connected.")}
                  className={buttonClass.secondary}
                >
                  Save preferences
                </button>
              </div>
            </Card>
          </div>

          <div id="security" className="scroll-mt-24">
            <Card title="Security" description="ARCA signs you in with a link sent to your email. There is no password to set, change or leak.">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-base font-semibold">Recent sessions</h3>
                <SampleBadge />
              </div>
              <ul className="mt-2 divide-y divide-marino/10">
                {SAMPLE_SESSIONS.map(session => {
                  const Icon = session.device.includes("iPhone") ? Smartphone : Laptop;
                  return (
                    <li key={session.id} className="flex items-center gap-3 py-3 text-sm">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-bruma">
                        <Icon aria-hidden className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{session.device}</p>
                        <p className="text-xs text-marino/60">
                          {session.place} · last active {formatDate(session.at)}
                        </p>
                      </div>
                      {session.current && <Badge tone="info">Current</Badge>}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => preview("Other devices will be signed out once sessions are connected.")}
                className={`${buttonClass.secondary} mt-3`}
              >
                Sign out other sessions
              </button>
            </Card>
          </div>

          <div id="integrations" className="scroll-mt-24">
            <Card title="Integrations" description="Connections to the tools a firm already uses.">
              <ul className="grid gap-3 sm:grid-cols-3">
                {INTEGRATIONS.map(({ name, hint, icon: Icon }) => (
                  <li key={name} className="rounded-2xl border border-marino/10 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-bruma">
                        <Icon aria-hidden className="h-4 w-4" />
                      </span>
                      <Badge>Coming soon</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{name}</p>
                    <p className="mt-1 text-xs text-marino/60">{hint}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div id="data-privacy" className="scroll-mt-24">
            <Card title="Data & privacy" description="Closing the organization starts with a request that ARCA reviews.">
              <h3 className="font-heading text-base font-semibold">Request deletion</h3>
              {pending ? (
                <p role="status" className="mt-2 rounded-2xl bg-oro/20 p-4 text-sm">
                  A deletion request is pending review by ARCA. Nothing is deleted until then, and access continues meanwhile.
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
                    disabled={pending}
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <button type="submit" disabled={busy || pending || !canRequest} className={buttonClass.danger}>
                  Request deletion
                </button>
              </form>
              {error && (
                <p role="alert" className="mt-4 text-sm text-rojo">
                  {error}
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
