"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

import { useApp } from "@/components/app/AppContext";
import { NAV_GROUPS, isCurrent } from "@/components/app/shell/nav";
import { EmptyState, LockedState, PageHeader, buttonClass } from "@/components/app/ui";
import { useCan } from "@/lib/app/access";

/**
 * The organization's standing notices, above every private page. Settings states the deletion itself next to its form,
 * so it is left out there and the text appears once.
 */
export function OrgNotices({ pathname }: { pathname: string }) {
  const { org } = useApp();
  const deletion = org.deletionPending && pathname !== "/app/settings";
  if (!deletion && org.billingStatus !== "past_due") return null;
  return (
    <div className="mb-6 space-y-3">
      {deletion && (
        <p className="rounded-2xl bg-oro/20 p-4 text-sm">
          A deletion request is pending review by ARCA. Nothing is deleted until then, and access continues meanwhile.
        </p>
      )}
      {org.billingStatus === "past_due" && (
        <p className="rounded-2xl bg-oro/20 p-4 text-sm">The last payment failed. Access continues for now.</p>
      )}
    </div>
  );
}

/**
 * A sample-data page's content, or the locked state when the organization has not paid. These pages ask the API
 * nothing, so no 402 would stop them (spec 2026-10-29 §4).
 */
export function SampleGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { org } = useApp();
  const canChoosePlan = useCan("billing.manage");
  return org.paidAccess ? <>{children}</> : <LockedState feature={feature} canChoosePlan={canChoosePlan} />;
}

/**
 * What a page the role does not open shows instead (DN-11 §6.1). The layout decides by pathname, before the page mounts,
 * so the page asks the API nothing. It takes the page's place, so it keeps the page's title, from the sidebar, as the h1.
 */
export function RoleGate({ pathname }: { pathname: string }) {
  const { org } = useApp();
  const group = NAV_GROUPS.find(candidate => candidate.items.some(item => isCurrent(item.href, pathname)));
  const page = group?.items.find(item => isCurrent(item.href, pathname));
  return (
    <>
      <PageHeader eyebrow={group?.label} title={page?.label ?? "Page not available"} />
      <EmptyState
        icon={Lock}
        title="Your role can't open this page"
        description={`Your role in ${org.name} doesn't include it. An owner or admin can open it.`}
        action={
          <Link href="/app" className={buttonClass.secondary}>
            Back to Overview
          </Link>
        }
      />
    </>
  );
}
