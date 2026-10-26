import type { PlanView } from "@arca/contracts";

/** A plan's price as billing and the admin page show it, e.g. "$499.00 / month". */
export const formatPrice = (plan: PlanView) =>
  `${new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency.toUpperCase() }).format(plan.amountCents / 100)} / ${plan.interval}`;
