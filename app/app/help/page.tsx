"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CalendarClock, ChevronDown, Mail } from "lucide-react";
import { ROLE_PERMISSIONS, ROLES, type Permission } from "@arca/contracts";

import { Card, PageHeader, buttonClass, inputClass, usePreview } from "@/components/app/ui";

const EMAIL = "hello@arcacover.com";
const CALENDLY = "https://calendly.com/arcacover/discovery";

const PERMISSION_LABEL: Record<Permission, string> = {
  "org.read": "see the organization's analyses and pages",
  "analysis.create": "save new analyses",
  "members.invite": "invite members",
  "members.remove": "remove members",
  "members.set_role": "change members' roles",
  "billing.manage": "manage billing",
  "org.transfer_ownership": "transfer ownership",
  "org.request_deletion": "request the organization's deletion",
};

const ROLE_LABEL = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" } as const;

// Read from the API's own permission table, so this answer cannot drift from what the back allows.
function RolesAnswer() {
  return (
    <>
      <ul className="space-y-2">
        {ROLES.map(role => (
          <li key={role}>
            <span className="font-semibold">{ROLE_LABEL[role]}</span> can{" "}
            {ROLE_PERMISSIONS[role].map(permission => PERMISSION_LABEL[permission]).join(", ")}.
          </li>
        ))}
      </ul>
      <p className="mt-3">An admin cannot change or remove an owner, nor make anyone an owner.</p>
    </>
  );
}

const FAQ: { question: string; answer: ReactNode }[] = [
  {
    question: "What is the AI Governance Score?",
    answer: (
      <>
        <p>
          A number from 0 to 100 that estimates how exposed your firm is to malpractice risk from the way it uses AI. A higher
          score means lower exposure.
        </p>
        <p className="mt-2">
          The scan reads public signals about your firm and scores four categories: AI Governance &amp; Policy, Professional
          Standing, Reputation and Firm Maturity. The assessment adds your own answers about policy, tools, human review, data
          protection, training and incident preparedness. The scoring rules are still provisional.
        </p>
      </>
    ),
  },
  {
    question: "Why is there no policy yet?",
    answer: (
      <p>
        An insurance policy needs a carrier, the company that takes on the risk. ARCA does not have an agreement with a carrier
        yet, so it cannot quote, bind or issue policies. Until then you can score your firm and work on what would lower its
        risk; quotes open once a carrier partner is in place.
      </p>
    ),
  },
  { question: "Who sees what in my organization?", answer: <RolesAnswer /> },
  {
    question: "How do I delete my organization?",
    answer: (
      <p>
        The owner sends a deletion request from Settings. It is only a request: a person at ARCA reviews it, and nothing is
        deleted before then. Access continues while the request is pending.
      </p>
    ),
  },
];

function Faq() {
  const base = useId();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card title="Frequently asked questions">
      <ul className="divide-y divide-marino/10">
        {FAQ.map((item, index) => {
          const expanded = open === index;
          const panel = `${base}-answer-${index}`;
          return (
            <li key={item.question}>
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panel}
                  onClick={() => setOpen(expanded ? null : index)}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold"
                >
                  {item.question}
                  <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </h3>
              <div id={panel} hidden={!expanded} className="pb-4 text-sm text-marino/75">
                {item.answer}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Feedback() {
  const id = useId();
  const preview = usePreview();
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    preview(`Feedback is not sent from here yet. Meanwhile, write to ${EMAIL}.`);
  }
  return (
    <Card title="Send feedback" description="Tell us what is missing or what got in your way.">
      <form onSubmit={onSubmit}>
        <label htmlFor={`${id}-feedback`} className="text-sm font-semibold">
          Your feedback
        </label>
        <textarea id={`${id}-feedback`} name="feedback" rows={4} required className={inputClass} />
        <p className="mt-2 text-xs text-marino/60">Preview only: nothing is sent from this form yet.</p>
        <button type="submit" className={`${buttonClass.primary} mt-4`}>
          Send feedback
        </button>
      </form>
    </Card>
  );
}

export default function HelpPage() {
  return (
    <>
      <PageHeader eyebrow="Help" title="Help and support" description="Answers to common questions, and how to reach ARCA." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Faq />
        </div>
        <div className="space-y-6">
          <Card title="Contact ARCA">
            <ul className="space-y-2 text-sm">
              <li>
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-bruma">
                  <Mail aria-hidden className="h-4 w-4" />
                  {EMAIL}
                </a>
              </li>
              <li>
                <a href={CALENDLY} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-bruma">
                  <CalendarClock aria-hidden className="h-4 w-4" />
                  Book a call with ARCA
                </a>
              </li>
            </ul>
          </Card>
          <Feedback />
        </div>
      </div>
    </>
  );
}
