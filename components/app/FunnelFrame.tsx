import type { ReactNode } from "react";

import { AssessmentOrb } from "@/components/assessment/AssessmentShell";

/**
 * The public screens of /app where someone gets in (the pre-checkout of /app/signup, /app/login and /app/invite), in the funnel's
 * own language (/quote, the assessment, the results): an editorial column with the orb and a short headline on the left, the card
 * on the right; stacked on a phone, headline first. The headline is the page's h1.
 */
export default function FunnelFrame({ eyebrow, title, description, aside, children }: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Small print under the description on wide screens: trust lines, what happens next. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
      <div className="lg:sticky lg:top-10">
        <div className="hidden lg:block">
          <AssessmentOrb />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-marino/70 lg:mt-9">{eyebrow}</p>
        <h1 className="mt-3 max-w-[420px] font-heading text-[30px] font-medium leading-[1.12] tracking-[-0.04em] text-marino sm:text-[38px] lg:text-[44px]">
          {title}
        </h1>
        {description && <div className="mt-4 max-w-[380px] text-sm leading-7 text-marino/70 sm:text-[15px]">{description}</div>}
        {aside && <div className="mt-7 hidden max-w-[360px] border-t border-marino/10 pt-5 text-xs leading-6 text-marino/70 lg:block">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** The white card of the right column. */
export function FunnelCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] border border-marino/8 bg-white p-6 shadow-[0_12px_50px_-30px_color-mix(in_srgb,var(--color-marino)_25%,transparent)] sm:p-8 ${className}`}>
      {children}
    </div>
  );
}

/** Who is signing in, as a chip: the initial, the email locked, and where it came from. */
export function IdentityChip({ email, source }: { email: string; source?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-marino/10 bg-bruma/50 py-2 pl-2 pr-5">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marino font-heading text-sm font-semibold uppercase text-white">
        {email.trim().charAt(0) || "?"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{email}</span>
        {source && <span className="block text-xs text-marino/60">{source}</span>}
      </span>
    </div>
  );
}
