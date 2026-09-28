"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2, Mail } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { ApiError, startScan } from "@/lib/api/client";
import { rememberSession } from "@/lib/api/session";
import { isEmailProviderAddress, isEmailProviderDomain } from "@/lib/email-providers";

// Enough to catch a typo, not enough to argue with RFC 5322.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The API accepts any email and never scores it: the scan reads the firm's website and
// the public registries, nothing else. A consumer mailbox is therefore fine, and saying
// otherwise would promise a better result the API does not deliver. The one thing it
// refuses is a mail provider typed in as the firm's website.
const PROVIDER_AS_WEBSITE =
  "That's an email provider, not your firm's website. Enter your firm's own site.";

const INPUT_CLASS =
  "w-full rounded-xl border border-bruma bg-white py-3.5 pl-12 pr-4 text-marino transition-colors placeholder:text-marino/40 focus:border-cielo focus:outline-none";

function waitMessage(seconds: number | undefined) {
  if (!seconds) return "You have run several scans recently. Please try again a little later.";
  const minutes = Math.ceil(seconds / 60);
  return `You have run several scans recently. Please try again in about ${
    minutes <= 1 ? "a minute" : `${minutes} minutes`
  }.`;
}

export default function QuotePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [domainTouched, setDomainTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Errors the API returned, kept apart from the local validation above.
  const [domainRejected, setDomainRejected] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError =
    emailTouched && email.trim() && !EMAIL_PATTERN.test(email.trim())
      ? "Please enter a valid email address."
      : null;

  const usesFreeMailbox =
    !emailError && EMAIL_PATTERN.test(email.trim()) && isEmailProviderAddress(email.trim());

  const domainError =
    domainRejected ??
    (domainTouched && !domain.trim()
      ? "Please enter your firm's website."
      : domainTouched && isEmailProviderDomain(domain)
        ? PROVIDER_AS_WEBSITE
        : null);

  const canSubmit = Boolean(email.trim()) && Boolean(domain.trim()) && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEmailTouched(true);
    setDomainTouched(true);
    setDomainRejected(null);
    setFormError(null);

    if (!EMAIL_PATTERN.test(email.trim()) || !domain.trim() || isEmailProviderDomain(domain)) return;

    setSubmitting(true);
    try {
      // The API records the lead as part of starting the scan: email and canonical domain
      // both land on the `scans` row. The front does not write to the database itself
      // (CLAUDE.md §3: business logic lives behind the API).
      const started = await startScan({ email: email.trim(), domain: domain.trim() });
      rememberSession(started.scanId, started.sessionToken);

      // Only the scanId travels in the URL from here. The email and the domain are insured
      // data and do not belong in a link, a referrer or browser history (CLAUDE.md §8).
      const next = started.status === "COMPLETED"
        // Cached domain: the result already exists, so there is nothing to wait for.
        ? `/score?scan=${encodeURIComponent(started.scanId)}`
        : `/quote/scanning?scan=${encodeURIComponent(started.scanId)}`;
      router.push(next);
    } catch (error) {
      setSubmitting(false);
      if (!(error instanceof ApiError)) {
        setFormError("Something went wrong starting your scan. Please try again.");
        return;
      }
      if (error.code === "personal_email_domain") {
        setDomainRejected(PROVIDER_AS_WEBSITE);
        return;
      }
      if (error.code === "invalid_domain" || error.code === "invalid_request") {
        setDomainRejected("We could not reach that website. Check the address and try again.");
        return;
      }
      setFormError(error.code === "rate_limited" ? waitMessage(error.retryAfter) : error.message);
    }
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
                A personal email works fine. The scan only reads your firm&apos;s website.
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
                onChange={(e) => {
                  setDomain(e.target.value);
                  setDomainRejected(null);
                }}
                onBlur={() => setDomainTouched(true)}
                placeholder="Firm website (e.g. smithlaw.com)"
                aria-label="Firm website"
                aria-invalid={Boolean(domainError)}
                className={INPUT_CLASS}
              />
            </div>
            {domainError && <p className="mt-2 text-sm text-rojo">{domainError}</p>}
          </div>

          {formError && (
            <p role="alert" className="mt-5 rounded-xl bg-rojo/10 px-4 py-3 text-sm text-marino">
              {formError}
            </p>
          )}

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
