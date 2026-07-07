"use client";

import { useState, type FormEvent } from "react";

type FieldName = "name" | "company" | "email" | "message";
type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, string>>;

const EMPTY_VALUES: FormValues = { name: "", company: "", email: "", message: "" };

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Please enter your name.";
  }
  if (!values.company.trim()) {
    errors.company = "Please enter your company.";
  }
  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!values.message.trim()) {
    errors.message = "Please tell us briefly what you need.";
  }
  return errors;
}

const INPUT_CLASSES =
  "w-full rounded-lg border bg-white px-4 py-3 text-marino outline-none transition-colors focus:border-cielo";

export default function QuoteForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function setField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // Never log or send form contents anywhere: they are the visitor's personal data.
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    // TODO: connect to Supabase
    setSubmitted(true);
  }

  function borderClass(field: FieldName) {
    return errors[field] ? "border-rojo" : "border-marino/20";
  }

  return (
    <section id="get-a-quote" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-xl">
        <h2 className="text-center font-heading text-3xl font-bold text-marino md:text-4xl">
          Get a quote.
        </h2>
        <p className="mt-4 text-center leading-relaxed text-marino/80">
          Tell us a little about your business and we&rsquo;ll get back to you.
        </p>
        <div aria-live="polite" className="mt-10">
          {submitted ? (
            <div className="rounded-2xl bg-bruma p-8 text-center">
              <p className="font-heading text-xl font-bold text-marino">
                Thanks — we got your message.
              </p>
              <p className="mt-2 text-marino/80">We&rsquo;ll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-bold text-marino">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={values.name}
                  onChange={(event) => setField("name", event.target.value)}
                  className={`${INPUT_CLASSES} ${borderClass("name")}`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-rojo">{errors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="company" className="mb-1 block text-sm font-bold text-marino">
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  value={values.company}
                  onChange={(event) => setField("company", event.target.value)}
                  className={`${INPUT_CLASSES} ${borderClass("company")}`}
                />
                {errors.company && (
                  <p className="mt-1 text-sm text-rojo">{errors.company}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-bold text-marino">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className={`${INPUT_CLASSES} ${borderClass("email")}`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-rojo">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-bold text-marino">
                  Short message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={values.message}
                  onChange={(event) => setField("message", event.target.value)}
                  className={`${INPUT_CLASSES} ${borderClass("message")}`}
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-rojo">{errors.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-oro px-8 py-4 text-lg font-bold text-marino transition-colors hover:bg-oro-oscuro"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
