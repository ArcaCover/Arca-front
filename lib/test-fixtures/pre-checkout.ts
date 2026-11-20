import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { OrgProfileInput } from "@/lib/app/checkout-contract";

// The pre-checkout's first three steps as a person fills them (DN-13 §19), for the tests of the sign-up, the billing page and the
// smoke of every mode. The profile the back then receives, normalized, is PROFILE.

export const PROFILE: OrgProfileInput = {
  contactName: "Ana Smith",
  contactRole: "managing_partner",
  phone: "+1 (305) 555-0100",
  legalName: "Smith Law LLP",
  ein: "12-3456789",
  billingAddress: { line1: "100 Main St", city: "Miami", state: "FL", postalCode: "33101" },
  attorneyRange: "6-20",
  practiceStates: ["FL", "NY"],
};

const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });

/** Step 1, "You": full name, role and phone. */
export async function fillYou(values: { name?: string; role?: string; phone?: string } = {}) {
  await userEvent.type(await screen.findByLabelText("Full name"), values.name ?? "Ana Smith");
  await userEvent.click(screen.getByRole("radio", { name: values.role ?? "Managing partner" }));
  if (values.phone !== "") await userEvent.type(screen.getByLabelText(/^Phone/), values.phone ?? "+1 (305) 555-0100");
  await userEvent.click(button("Continue"));
}

/** Step 2, "Your firm": legal name, EIN, the billing address, attorneys and where the firm practices. */
export async function fillFirm(values: { ein?: string } = {}) {
  await userEvent.type(await screen.findByLabelText("Firm legal name"), "Smith Law LLP");
  if (values.ein !== "") await userEvent.type(screen.getByLabelText(/^EIN/), values.ein ?? "123456789");
  await userEvent.type(screen.getByLabelText("Street address"), "100 Main St");
  await userEvent.type(screen.getByLabelText("City"), "Miami");
  await userEvent.selectOptions(screen.getByLabelText("State"), "FL");
  await userEvent.type(screen.getByLabelText("ZIP code"), "33101");
  await userEvent.click(screen.getByRole("radio", { name: "6–20" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Florida" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "New York" }));
  await userEvent.click(button("Continue"));
}

/** Step 3, "Plan": one of the plans the API listed. */
export async function choosePlan(name: string | RegExp = /Monthly/) {
  await userEvent.click(await screen.findByRole("radio", { name }));
  await userEvent.click(button("Continue"));
}

/** Steps 1 to 3 with the values of PROFILE, ending on step 4. */
export async function throughPlan(plan: string | RegExp = /Monthly/) {
  await fillYou();
  await fillFirm();
  await choosePlan(plan);
}
