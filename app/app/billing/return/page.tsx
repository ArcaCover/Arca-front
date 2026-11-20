"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useApp } from "@/components/app/AppContext";
import { Card, PageHeader, buttonClass } from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { getOrg, syncBilling } from "@/lib/app/client";

// Where Stripe sends the owner once Checkout is paid (DN-13 §6.3, §19): `session_id` names the session. The back reads it at Stripe
// and applies it by the webhook's path, so the organization usually pays at once; if not, the page asks every 2 seconds for up to
// 30, then says the payment is being confirmed. Only the back gives access.
const SESSION = /^cs_(test|live)_[A-Za-z0-9]{1,255}$/;
const EVERY_MS = 2_000;
const WAIT_MS = 30_000;

type State = { kind: "confirming" } | { kind: "waiting" } | { kind: "failed"; message: string; retry: boolean };

function ReturnScreen() {
  const { org } = useApp();
  const router = useRouter();
  const sessionId = useSearchParams().get("session_id");
  const valid = sessionId !== null && SESSION.test(sessionId);
  const [state, setState] = useState<State>(valid ? { kind: "confirming" }
    : { kind: "failed", message: "There is no payment to confirm on this page.", retry: false });
  // Each run syncs the session (the first one, or a retry after a failure) or only reads the organization ("Check again").
  const [run, setRun] = useState({ n: 0, sync: true });

  useEffect(() => {
    if (!valid || !sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sleep = (ms: number) => new Promise<void>(resolve => { timer = setTimeout(resolve, ms); });
    (async () => {
      try {
        let current = run.sync ? await syncBilling(org.id, sessionId) : await getOrg(org.id);
        const started = Date.now();
        while (!current.paidAccess) {
          if (Date.now() - started >= WAIT_MS) {
            if (!cancelled) setState({ kind: "waiting" });
            return;
          }
          await sleep(EVERY_MS);
          if (cancelled) return;
          current = await getOrg(org.id);
          if (cancelled) return;
        }
        if (!cancelled) router.replace("/app?paid=1");
      } catch (cause) {
        if (cancelled) return;
        setState(cause instanceof ApiError && cause.code === "not_found"
          ? { kind: "failed", retry: false,
            message: `We could not find this payment for ${org.name}. If you paid, it shows in Billing within a few minutes.` }
          : { kind: "failed", retry: true, message: cause instanceof ApiError ? cause.message : "We could not confirm the payment. Please try again." });
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [valid, sessionId, org.id, org.name, run, router]);

  const again = (sync: boolean) => {
    setState({ kind: "confirming" });
    setRun(current => ({ n: current.n + 1, sync }));
  };
  const back = (
    <Link href="/app/billing" className={buttonClass.secondary}>
      Back to Billing
    </Link>
  );

  return (
    <>
      <PageHeader eyebrow="Billing" title="Your payment" />
      <Card>
        {state.kind === "confirming" && (
          <p role="status" className="text-sm text-marino/80">
            Confirming your payment with Stripe…
          </p>
        )}
        {state.kind === "waiting" && (
          <>
            <p role="status" className="text-sm text-marino/80">
              Your payment is being confirmed. This can take a minute; Billing shows it as soon as it is done.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => again(false)} className={buttonClass.primary}>
                Check again
              </button>
              {back}
            </div>
          </>
        )}
        {state.kind === "failed" && (
          <>
            <p role="alert" className="text-sm">
              {state.message}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {state.retry && (
                <button type="button" onClick={() => again(true)} className={buttonClass.primary}>
                  Try again
                </button>
              )}
              {back}
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export default function BillingReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnScreen />
    </Suspense>
  );
}
