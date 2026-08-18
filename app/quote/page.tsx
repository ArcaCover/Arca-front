"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2, Mail } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";

// Enough to catch a typo, not enough to argue with RFC 5322.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A consumer mailbox is a hint that we are talking to a solo practitioner, not
// a reason to turn them away: the scan runs on the firm's domain, which we ask
// for separately.
const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
];

const INPUT_CLASS =
  "w-full rounded-xl border border-bruma bg-white py-3.5 pl-12 pr-4 text-marino transition-colors placeholder:text-marino/40 focus:border-cielo focus:outline-none";

export default function QuotePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [domainTouched, setDomainTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailError =
    emailTouched && email.trim() && !EMAIL_PATTERN.test(email.trim())
      ? "Please enter a valid email address."
      : null;

  const usesFreeMailbox =
    !emailError &&
    EMAIL_PATTERN.test(email.trim()) &&
    FREE_EMAIL_DOMAINS.includes(email.trim().toLowerCase().split("@")[1]);

  const domainError =
    domainTouched && !domain.trim() ? "Please enter your firm's website." : null;

  const canSubmit = Boolean(email.trim()) && Boolean(domain.trim()) && !submitting;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setDomainTouched(true);

    if (!EMAIL_PATTERN.test(email.trim()) || !domain.trim()) return;

    // TODO: save lead to Supabase
    setSubmitting(true);

    // The two values ride in the query string rather than storage or global
    // state, so the scan is reproducible from the URL alone.
    const params = new URLSearchParams({ email: email.trim(), domain: domain.trim() });
    router.push(`/quote/scanning?${params}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-[480px]">
        <ArcaWordmark className="mx-auto h-7 w-auto text-marino" />

        <h1 className="mt-12 text-center font-heading text-2xl font-semibold tracking-tight text-marino">
          Let&apos;s scan your firm.
        </h1>
        <p className="mx-auto mt-4 text-center text-base text-marino/60">
          Enter your work email and your firm&apos;s website. We&apos;ll analyze your AI
          risk exposure in under 60 seconds.
        </p>

        <form onSubmit={handleSubmit} className="mt-10" noValidate>
          <div>
            <div className="relative">
              <Mail
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-marino/40"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="Work email"
                aria-label="Work email"
                aria-invalid={Boolean(emailError)}
                className={INPUT_CLASS}
              />
            </div>
            {emailError && <p className="mt-2 text-sm text-rojo">{emailError}</p>}
            {usesFreeMailbox && (
              <p
                className="mt-2 text-sm"
                // Oro-oscuro on its own reads at 2.27:1 over the canvas. Pulled
                // towards marino until it clears AA at 4.86:1, still warm enough
                // to say "note" rather than "error".
                style={{
                  color:
                    "color-mix(in srgb, var(--color-oro-oscuro) 55%, var(--color-marino))",
                }}
              >
                We&apos;ll get better results with your firm&apos;s email.
              </p>
            )}
          </div>

          <div className="mt-5">
            <div className="relative">
              <Globe
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-marino/40"
              />
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onBlur={() => setDomainTouched(true)}
                placeholder="Firm website (e.g. smithlaw.com)"
                aria-label="Firm website"
                aria-invalid={Boolean(domainError)}
                className={INPUT_CLASS}
              />
            </div>
            {domainError && <p className="mt-2 text-sm text-rojo">{domainError}</p>}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="cta-glow group mt-8 flex w-full cursor-pointer items-center justify-center gap-3.5 rounded-full bg-oro py-2.5 pl-6 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {submitting ? (
              <Loader2 aria-label="Scanning" className="my-[7px] h-6 w-6 animate-spin" />
            ) : (
              <>
                Scan my firm
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-marino/40">
          By continuing, you agree to Arca&apos;s{" "}
          {/* TODO: link to legal pages */}
          <a href="#" className="underline underline-offset-2 hover:text-marino/60">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2 hover:text-marino/60">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  );
}
