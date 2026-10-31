import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

// The three button looks of /app. Classes rather than a component, so a Link and a button can share them.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cielo disabled:cursor-not-allowed disabled:opacity-55";
export const buttonClass = {
  primary: `${BASE} bg-oro text-marino hover:bg-oro-oscuro`,
  secondary: `${BASE} border border-marino/20 bg-white text-marino hover:bg-bruma`,
  danger: `${BASE} border border-rojo/40 bg-white text-rojo hover:bg-rojo/5`,
  ghost: `${BASE} text-marino/80 hover:bg-marino/5`,
} as const;

export function PageHeader({
  title, description, actions, eyebrow,
}: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-marino/55">{eyebrow}</p>}
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-marino/70">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title, description, actions, sample, children, className = "", as: Tag = "section",
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Marks the card as fed by sample data: every such block says so (spec 2026-10-29 §3). */
  sample?: boolean | "illustrative";
  children?: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Tag className={`rounded-3xl border border-marino/10 bg-white p-5 sm:p-6 ${className}`}>
      {(title || actions || sample) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-heading text-lg font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-sm text-marino/70">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sample && <SampleBadge illustrative={sample === "illustrative"} />}
            {actions}
          </div>
        </div>
      )}
      {children}
    </Tag>
  );
}

export function StatCard({
  label, value, hint, icon: IconCmp, sample = true, href,
}: { label: string; value: ReactNode; hint?: ReactNode; icon: Icon; sample?: boolean; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-bruma text-marino">
          <IconCmp aria-hidden className="h-4 w-4" />
        </span>
        {sample && <SampleBadge />}
      </div>
      <p className="mt-4 text-sm text-marino/70">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-marino/60">{hint}</p>}
    </>
  );
  const cls = "block rounded-3xl border border-marino/10 bg-white p-5 transition-colors";
  return href ? (
    <Link href={href} className={`${cls} hover:border-marino/25`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";
const TONE: Record<Tone, string> = {
  neutral: "bg-marino/5 text-marino/80",
  info: "bg-cielo/20 text-marino",
  success: "bg-bruma text-marino",
  warning: "bg-oro/25 text-marino",
  danger: "bg-rojo/10 text-rojo",
  gold: "bg-oro text-marino",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** The label every block of sample data carries. */
export function SampleBadge({ illustrative = false }: { illustrative?: boolean }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-marino/30 px-2 py-0.5 text-[11px] font-semibold text-marino/65">
      {illustrative ? "Sample data · Illustrative" : "Sample data"}
    </span>
  );
}

export function EmptyState({
  icon: IconCmp, title, description, action,
}: { icon: Icon; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-marino/20 bg-white px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-bruma">
        <IconCmp aria-hidden className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-heading text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-marino/70">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * What a sample-data page shows to an organization that has not paid. The API stays the authority over real data;
 * this only keeps the preview from contradicting the paywall (spec 2026-10-29 §4).
 */
export function LockedState({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={Lock}
      title={`Choose a plan to unlock ${feature}`}
      description="Your organization's workspace opens once a plan is active."
      action={
        <Link href="/app/billing" className={buttonClass.primary}>
          See plans
        </Link>
      }
    />
  );
}

/** A labelled value in a definition grid. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marino/55">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export const inputClass =
  "mt-1 block w-full rounded-xl border border-marino/20 bg-white px-3 py-2 text-sm focus-visible:outline-2 " +
  "focus-visible:outline-cielo disabled:opacity-60";

export function initials(text: string): string {
  const words = text.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-marino font-semibold text-white ${dims}`}>
      {initials(name)}
    </span>
  );
}

const DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", DATE);
