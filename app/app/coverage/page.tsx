"use client";

import { useId, useState, type FormEvent } from "react";
import { FileWarning, Handshake, MessageSquareQuote, ShieldOff } from "lucide-react";

import { SampleGate } from "@/components/app/shell/OrgNotices";
import { Badge, Card, Dialog, PageHeader, buttonClass, inputClass, usePreview } from "@/components/app/ui";
import { FIRST_PARTY_GROUP, THIRD_PARTY_GROUP } from "@/components/coverage/coverage-details";
import { ILLUSTRATIVE_LIMITS } from "@/lib/app/mock/records";

type Open = "quote" | "broker" | "incident" | null;

function Coverage() {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const preview = usePreview();

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bruma">
            <ShieldOff aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold">No active policy</h2>
            <p className="mt-1 max-w-2xl text-sm text-marino/70">
              ARCA does not have an agreement with an insurance carrier yet, so it cannot bind or issue policies. Scoring
              works today; coverage opens once a carrier partner is in place.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen("quote")} className={buttonClass.primary}>
            <MessageSquareQuote aria-hidden className="h-4 w-4" />
            Request a quote
          </button>
          <button type="button" onClick={() => setOpen("broker")} className={buttonClass.secondary}>
            <Handshake aria-hidden className="h-4 w-4" />
            Connect with a broker
          </button>
          <button type="button" onClick={() => setOpen("incident")} className={buttonClass.secondary}>
            <FileWarning aria-hidden className="h-4 w-4" />
            Report an incident
          </button>
        </div>
      </Card>

      <Card
        className="mt-6"
        title="What the policy would cover"
        description="The eight coverages planned for AI Professional Malpractice."
        sample
        actions={<Badge>Coverage names pending validation</Badge>}
      >
        <div className="grid gap-6 md:grid-cols-2">
          {[THIRD_PARTY_GROUP, FIRST_PARTY_GROUP].map(group => (
            <div key={group.id}>
              <h3 className="font-heading text-base font-semibold">{group.label}</h3>
              <ul className="mt-3 space-y-3">
                {group.coverages.map(coverage => (
                  <li key={coverage.number} className="rounded-2xl bg-bruma/60 p-4">
                    <p className="text-sm font-semibold">{coverage.name}</p>
                    <p className="mt-1 text-sm text-marino/70">{coverage.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card
        className="mt-6"
        title="Limit options"
        description="Limits only. There is no price to show until ARCA has a carrier partner."
        sample="illustrative"
      >
        <ul className="grid gap-4 sm:grid-cols-3">
          {ILLUSTRATIVE_LIMITS.map(limit => (
            <li key={limit.key} className="rounded-2xl border border-marino/10 p-4">
              <p className="font-heading text-base font-semibold">{limit.name}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-marino/60">Per claim</dt>
                  <dd className="font-semibold">{limit.perClaim}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-marino/60">Aggregate</dt>
                  <dd className="font-semibold">{limit.aggregate}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-marino/60">{limit.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-marino/60">Illustrative: final limits depend on the carrier partner.</p>
      </Card>

      <Dialog
        open={open === "quote"}
        onClose={close}
        title="Request a quote"
        footer={
          <button type="button" onClick={close} className={buttonClass.secondary}>
            Close
          </button>
        }
      >
        <p className="font-semibold">Quotes open once ARCA has a carrier partner.</p>
        <p className="mt-2 text-marino/70">
          Until then ARCA cannot price or bind a policy. Keep improving your score: it is what a quote will start from.
        </p>
      </Dialog>

      <Dialog
        open={open === "broker"}
        onClose={close}
        title="Connect with a broker"
        description="Brokers are how most firms will buy ARCA coverage."
        footer={
          <>
            <button type="button" onClick={close} className={buttonClass.secondary}>
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                preview("Broker introductions start once ARCA has a carrier partner.");
              }}
              className={buttonClass.primary}
            >
              Request an introduction
            </button>
          </>
        }
      >
        <p>
          ARCA will connect you with a certified broker who already works with law firms. They receive your score and report so
          the conversation starts from your actual practices.
        </p>
      </Dialog>

      <Dialog
        open={open === "incident"}
        onClose={close}
        variant="drawer"
        title="Report an incident"
        description="An AI error in your firm's work, or one you suspect."
      >
        <IncidentForm onCancel={close} />
      </Dialog>
    </>
  );
}

// Uncontrolled on purpose: a preview submit must leave what the user typed exactly where it was.
function IncidentForm({ onCancel }: { onCancel: () => void }) {
  const id = useId();
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${id}-date`} className="text-sm font-semibold">
          When it happened
        </label>
        <input id={`${id}-date`} name="date" type="date" required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-what`} className="text-sm font-semibold">
          What happened
        </label>
        <textarea id={`${id}-what`} name="what" rows={5} required className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-who`} className="text-sm font-semibold">
          Who noticed it
        </label>
        <input id={`${id}-who`} name="who" type="text" className={inputClass} placeholder="A partner, a client, the court…" />
      </div>
      {submitted && (
        <p role="status" className="rounded-2xl bg-bruma p-3 text-sm">
          Preview only. Nothing was sent.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClass.secondary}>
          Cancel
        </button>
        <button type="submit" className={buttonClass.primary}>
          Submit report
        </button>
      </div>
    </form>
  );
}

export default function CoveragePage() {
  return (
    <>
      <PageHeader
        eyebrow="Coverage"
        title="Your coverage"
        description="What an ARCA policy would cover and where things stand today."
      />
      <SampleGate feature="coverage">
        <Coverage />
      </SampleGate>
    </>
  );
}
