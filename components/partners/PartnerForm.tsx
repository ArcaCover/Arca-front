"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";

const LICENSED_STATES = ["FL", "TX", "CA", "NY", "Other"];

const BOOK_SIZES = ["1-20", "21-50", "51-100", "100+"];

const FIELDS = [
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name" },
  { name: "company", label: "Company", type: "text", autoComplete: "organization" },
  { name: "workEmail", label: "Work email", type: "email", autoComplete: "email" },
  { name: "licenseNumber", label: "License number", type: "text", autoComplete: "off" },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-bruma bg-white px-4 py-3.5 text-marino transition-colors focus:border-cielo focus:outline-none";

const LABEL_CLASS = "block font-heading text-sm font-semibold text-marino";

export default function PartnerForm() {
  const [states, setStates] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggleState(state: string) {
    setStates((current) =>
      current.includes(state)
        ? current.filter((entry) => entry !== state)
        : [...current, state],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    // TODO: POST /api/v1/partners/request
    console.log({
      fullName: data.get("fullName"),
      company: data.get("company"),
      workEmail: data.get("workEmail"),
      licenseNumber: data.get("licenseNumber"),
      licensedStates: states,
      bookSize: data.get("bookSize"),
    });

    setSubmitted(true);
  }

  return (
    <section id="become-a-partner" className="scroll-mt-24 px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[680px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          Become a partner
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-center text-[18px] leading-relaxed text-marino/80">
          For U.S.-licensed brokers specializing in professional liability or E&amp;O,
          with a book of small to midsize law firms. Starting in FL, TX, CA, and NY.
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

              <fieldset>
                <legend className={LABEL_CLASS}>Licensed states</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {LICENSED_STATES.map((state) => {
                    const checked = states.includes(state);

                    return (
                      <label
                        key={state}
                        className={`cursor-pointer rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors has-[:focus-visible]:border-cielo ${
                          checked
                            ? "border-cielo bg-cielo/10 text-marino"
                            : "border-bruma text-marino/70 hover:border-cielo/50"
                        }`}
                      >
                        {/* HTML5 cannot express "at least one of this group", so
                            the requirement sits on every box until one is
                            checked. That way the browser supplies its own
                            message and focus instead of a hand-rolled one. */}
                        <input
                          type="checkbox"
                          name="licensedStates"
                          value={state}
                          checked={checked}
                          onChange={() => toggleState(state)}
                          required={states.length === 0}
                          className="sr-only"
                        />
                        {state}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className={LABEL_CLASS}>Book size</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {BOOK_SIZES.map((size) => (
                    <label
                      key={size}
                      className="group cursor-pointer rounded-full border border-bruma px-5 py-2.5 text-sm font-semibold text-marino/70 transition-colors hover:border-cielo/50 has-[:checked]:border-cielo has-[:checked]:bg-cielo/10 has-[:checked]:text-marino has-[:focus-visible]:border-cielo"
                    >
                      <input
                        type="radio"
                        name="bookSize"
                        value={size}
                        required
                        className="sr-only"
                      />
                      {size}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                className="cta-glow w-full cursor-pointer rounded-full bg-oro py-3.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
              >
                Submit request
              </button>

              <p className="text-center text-sm leading-relaxed text-marino/55">
                This is a partnership inquiry, not a binding agreement. We&rsquo;ll reach
                out within 48 hours.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
