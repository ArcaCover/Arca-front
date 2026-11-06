"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CreditCard, Download } from "lucide-react";
import { can, type BillingStatus, type PlanView } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { Badge, Card, PageHeader, buttonClass, formatDate, inputClass, usePreview } from "@/components/app/ui";
import { checkout, getPlans, portal } from "@/lib/app/client";
import { SAMPLE_INVOICES } from "@/lib/app/mock/records";
import { formatPrice } from "@/lib/app/price";

const STATUS: Record<BillingStatus, string> = {
  pending_payment: "Pending payment",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export default function BillingPage() {
  const { org } = useApp();
  const fail = useFailure();
  const preview = usePreview();
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", address: "" });

  // The prices come from the API's plans table, so a price changed there shows here on the next visit. A paid organization
  // is not offered them: the back answers 409 to a second checkout.
  useEffect(() => {
    if (org.paidAccess) return;
    let cancelled = false;
    getPlans()
      .then(list => {
        if (!cancelled) setPlans(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(fail(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [fail, org.paidAccess]);

  // DN-10 §5: the button follows the role, except in the debug modes, where it stays active so the demo shows the back's 403.
  const canPay =
    process.env.NEXT_PUBLIC_ARCA_MODE === "mock" ||
    process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ||
    can(org.role, "billing.manage");

  async function leaveFor(page: () => Promise<{ url: string }>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await page();
      // The provider's checkout or portal is another page (in mock, /app/billing/mock-checkout or this page again),
      // reached by a full navigation.
      window.location.assign(url);
    } catch (cause) {
      setError(fail(cause));
      setBusy(false);
    }
  }

  function saveContact(event: FormEvent) {
    event.preventDefault();
    preview("The billing contact will be saved once billing details are connected.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Billing"
        description="Your organization's plan, its invoices and who receives them."
      />
      {error && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}

      <Card title="Current plan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-bruma">
              <CreditCard aria-hidden className="h-5 w-5" />
            </span>
            <div className="text-sm">
              <p>
                Status: <strong>{STATUS[org.billingStatus]}</strong>
              </p>
              {!org.paidAccess && (
                <p className="mt-1 text-marino/70">Choose a plan to open your organization&apos;s analyses.</p>
              )}
              {!canPay && <p className="mt-1 text-marino/70">Only the owner can manage billing.</p>}
            </div>
          </div>
          {org.paidAccess && (
            <button
              type="button"
              onClick={() => leaveFor(() => portal(org.id))}
              disabled={busy || !canPay}
              className={buttonClass.secondary}
            >
              Manage billing
            </button>
          )}
        </div>
      </Card>

      {!org.paidAccess &&
        (plans === null ? (
          !error && (
            <p role="status" className="mt-6 text-sm text-marino/70">
              Loading plans…
            </p>
          )
        ) : (
          <ul aria-label="Plans" className="mt-6 grid gap-4 sm:grid-cols-2">
            {plans.map(plan => (
              <li key={plan.code} className="flex flex-col rounded-3xl border border-marino/10 bg-white p-6">
                <h2 className="font-heading text-lg font-semibold">{plan.name}</h2>
                <p className="mt-1 font-heading text-2xl font-semibold">{formatPrice(plan)}</p>
                <p className="mt-2 flex-1 text-sm text-marino/70">Opens the organization&apos;s analyses for every member.</p>
                <button
                  type="button"
                  aria-label={`Pay with ${plan.name}`}
                  onClick={() => leaveFor(() => checkout(org.id, plan.code))}
                  disabled={busy || !canPay}
                  className={`${buttonClass.primary} mt-5 self-start`}
                >
                  Pay
                </button>
              </li>
            ))}
          </ul>
        ))}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Invoices"
          description="Amounts are left out on purpose: this preview does not invent charges."
          sample={org.paidAccess}
        >
          {org.paidAccess ? (
            <div className="overflow-x-auto">
              <table aria-label="Invoices" className="w-full min-w-[30rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-marino/10 text-xs uppercase tracking-wide text-marino/55">
                    <th scope="col" className="py-2 pr-4 font-semibold">Invoice</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Period</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Issued</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                    <th scope="col" className="py-2 font-semibold">
                      <span className="sr-only">Download</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-marino/10">
                  {SAMPLE_INVOICES.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-4 font-semibold">{invoice.id}</td>
                      <td className="py-3 pr-4">{invoice.period}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.issued)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={invoice.status === "paid" ? "success" : "info"}>
                          {invoice.status === "paid" ? "Paid" : "Open"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          disabled
                          aria-label={`Download ${invoice.id} (coming soon)`}
                          title="Coming soon"
                          className={buttonClass.ghost}
                        >
                          <Download aria-hidden className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // An organization that has not paid has had no charges, so sample invoices would contradict its status.
            <p className="text-sm text-marino/70">No invoices yet. They appear here once a plan is active.</p>
          )}
        </Card>

        <Card title="Billing contact" description="Who receives invoices and payment notices." sample>
          <form onSubmit={saveContact} className="space-y-3 text-sm">
            <label className="block">
              Contact name
              <input
                value={contact.name}
                onChange={event => setContact({ ...contact, name: event.target.value })}
                autoComplete="name"
                className={inputClass}
              />
            </label>
            <label className="block">
              Billing email
              <input
                type="email"
                value={contact.email}
                onChange={event => setContact({ ...contact, email: event.target.value })}
                autoComplete="email"
                className={inputClass}
              />
            </label>
            <label className="block">
              Mailing address
              <textarea
                rows={2}
                value={contact.address}
                onChange={event => setContact({ ...contact, address: event.target.value })}
                autoComplete="street-address"
                className={inputClass}
              />
            </label>
            <button type="submit" className={buttonClass.secondary}>
              Save
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
