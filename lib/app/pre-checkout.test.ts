import { describe, expect, it } from "vitest";

import { EmbeddedCheckoutResponse } from "./checkout-contract";
import { EMPTY_DRAFT, profileOf, validateFirm, validateYou, type ProfileDraft } from "./pre-checkout";
import { US_STATES } from "./us-states";

// DN-13 §19: the pre-checkout's rules, the same as the back's OrgProfileInput (packages/contracts/src/webapp.ts in Arca-back), so a
// form the page lets through is one POST /orgs takes. The front keeps its own copy until contracts 0.5.0.
const DRAFT: ProfileDraft = {
  contactName: " Ana Smith ", contactRole: "managing_partner", phone: "+1 (305) 555-0100", legalName: " Smith Law LLP ", ein: "123456789",
  line1: " 100 Main St ", city: " Miami ", state: "FL", postalCode: "33101", attorneyRange: "6-20", practiceStates: ["FL", "NY"],
};

describe("the pre-checkout's rules", () => {
  it("asks for nothing more on a complete draft, and sends it normalized", () => {
    expect(validateYou(DRAFT)).toEqual({});
    expect(validateFirm(DRAFT)).toEqual({});
    expect(profileOf(DRAFT)).toEqual({
      contactName: "Ana Smith", contactRole: "managing_partner", phone: "+1 (305) 555-0100", legalName: "Smith Law LLP", ein: "12-3456789",
      billingAddress: { line1: "100 Main St", city: "Miami", state: "FL", postalCode: "33101" }, attorneyRange: "6-20", practiceStates: ["FL", "NY"],
    });
  });

  it("leaves the phone and the EIN optional: blank ones go as null", () => {
    const draft = { ...DRAFT, phone: "  ", ein: "" };
    expect(validateYou(draft)).toEqual({});
    expect(validateFirm(draft)).toEqual({});
    expect(profileOf(draft)).toMatchObject({ phone: null, ein: null });
  });

  it("says what is missing in step 1, field by field", () => {
    expect(validateYou(EMPTY_DRAFT)).toEqual({ contactName: "Enter your full name.", contactRole: "Choose your role." });
    expect(validateYou({ ...DRAFT, phone: "555-0100" })).toEqual({ phone: "Enter a phone number with 10 to 15 digits, or leave it empty." });
    expect(validateYou({ ...DRAFT, phone: "call me maybe" })).toHaveProperty("phone");
    expect(validateYou({ ...DRAFT, phone: "+1 305 555 0100 0000 0000" })).toHaveProperty("phone");
    expect(validateYou({ ...DRAFT, contactName: "a".repeat(121) })).toEqual({ contactName: "Use at most 120 characters." });
  });

  it("says what is missing in step 2, field by field", () => {
    expect(validateFirm(EMPTY_DRAFT)).toEqual({
      legalName: "Enter the firm's legal name.", line1: "Enter the street address.", city: "Enter the city.", state: "Choose the state.",
      postalCode: "Enter a 5-digit ZIP code, or ZIP+4.", attorneyRange: "Choose how many attorneys work at the firm.",
      practiceStates: "Choose at least one state where the firm practices.",
    });
    expect(validateFirm({ ...DRAFT, ein: "12-34" })).toEqual({ ein: "An EIN has 9 digits, like 12-3456789. You can leave it empty." });
    expect(validateFirm({ ...DRAFT, postalCode: "3310" })).toHaveProperty("postalCode");
    expect(validateFirm({ ...DRAFT, postalCode: "33101-1234" })).toEqual({});
    expect(validateFirm({ ...DRAFT, state: "PR" as ProfileDraft["state"] })).toHaveProperty("state");
  });

  it("offers the 50 states and DC, by name, as the back takes them", () => {
    expect(US_STATES).toHaveLength(51);
    expect(new Set(US_STATES.map(state => state.code)).size).toBe(51);
    expect(US_STATES.find(state => state.code === "DC")?.name).toBe("District of Columbia");
    expect(US_STATES.find(state => state.code === "FL")?.name).toBe("Florida");
  });

  it("reads the embedded Checkout's answer strictly, as the contract will", () => {
    expect(EmbeddedCheckoutResponse.parse({ clientSecret: "cs_test_a_secret_b", sessionId: "cs_test_a" }))
      .toEqual({ clientSecret: "cs_test_a_secret_b", sessionId: "cs_test_a" });
    for (const value of [null, {}, { clientSecret: "", sessionId: "cs_test_a" }, { clientSecret: "x", sessionId: "cs_test_a", url: "u" },
      { url: "https://checkout.stripe.com" }]) {
      expect(() => EmbeddedCheckoutResponse.parse(value)).toThrow();
    }
  });
});
