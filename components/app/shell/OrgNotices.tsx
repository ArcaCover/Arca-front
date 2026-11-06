"use client";

import type { ReactNode } from "react";
import { useApp } from "@/components/app/AppContext";
import { LockedState } from "@/components/app/ui";

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
  return org.paidAccess ? <>{children}</> : <LockedState feature={feature} />;
}
