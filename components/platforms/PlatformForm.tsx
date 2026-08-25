"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

// Deliberately its own form rather than one shared with the partner request:
// the two ask the same three things today, but they post to different places
// and are likely to diverge. Merging them now would be an abstraction of one.
const FIELDS = [
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name" },
  { name: "company", label: "Company", type: "text", autoComplete: "organization" },
  { name: "workEmail", label: "Work email", type: "email", autoComplete: "email" },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-bruma bg-white px-4 py-3.5 text-marino transition-colors focus:border-cielo focus:outline-none";

const LABEL_CLASS = "block font-heading text-sm font-semibold text-marino";

export default function PlatformForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    // TODO: POST to backend
    console.log({
      fullName: data.get("fullName"),
      company: data.get("company"),
      workEmail: data.get("workEmail"),
    });

    setSubmitted(true);
  }

  return (
    <section id="request-api-access" className="scroll-mt-24 px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[680px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          Let&rsquo;s build together
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-center text-[18px] leading-relaxed text-marino/80">
          We&rsquo;re onboarding a small number of platform partners for early API access.
          If you&rsquo;re building for law firms and want to be first to offer embedded AI
          liability coverage, reach out.
        </p>

        <div className="mt-12 rounded-3xl bg-white p-8 shadow-sm sm:p-10">
          {submitted ? (
            <p
              role="status"
              className="flex items-center justify-center gap-3 py-8 text-center font-heading text-lg text-marino"
            >
              <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-cielo" />
              Thank you. We&rsquo;ll be in touch within 48 hours.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {FIELDS.map((field) => (
                <div key={field.name}>
                  <label className={LABEL_CLASS} htmlFor={field.name}>
                    {field.label}
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    required
                    className={`mt-2 ${INPUT_CLASS}`}
                  />
                </div>
              ))}

              <button
                type="submit"
                className="cta-glow w-full cursor-pointer rounded-full bg-oro py-3.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
              >
                Request API access
              </button>

              <p className="text-center text-sm leading-relaxed text-marino/55">
                We&rsquo;ll follow up within 48 hours to schedule a technical walkthrough.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
