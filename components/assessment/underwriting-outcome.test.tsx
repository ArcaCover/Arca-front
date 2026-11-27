// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UnderwritingOutcome, { INDICATIVE_LINE } from "@/components/assessment/UnderwritingOutcome";
import { fixtureUnderwritingResult } from "@/lib/test-fixtures/assessment";

afterEach(cleanup);

describe("bank 4.0's outcome", () => {
  it("shows the premium of the default limit and switches only between the premiums the API priced", async () => {
    render(<UnderwritingOutcome outcome={fixtureUnderwritingResult().outcome} />);
    expect(screen.getByText("$12,707")).toBeTruthy();
    expect(screen.getByText(INDICATIVE_LINE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "$1M" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "$2M" }));
    expect(screen.getByText("$17,154")).toBeTruthy();
    expect(screen.queryByText("$12,707")).toBeNull();
  });

  it("lists the conditions of a bind with conditions", () => {
    const result = fixtureUnderwritingResult();
    if (result.outcome.type !== "quote") throw new Error("fixture is a quote");
    result.outcome.quote.conditions = [{ what: "Always, no exception", why: "Does a lawyer review all of it?", dueDays: 90, fromQuestion: "P3-1" }];
    render(<UnderwritingOutcome outcome={result.outcome} />);
    expect(screen.getByText("Within the first 90 days")).toBeTruthy();
    expect(screen.getByText("Always, no exception")).toBeTruthy();
  });

  it("gives a booking link and no number at all when an underwriter has to look", () => {
    const { container } = render(<UnderwritingOutcome outcome={{ type: "schedule", schedule: {
      message: "A member of our underwriting team will go through your answers with you.",
      bookingUrl: "https://calendly.com/arcacover/discovery", withWhom: "underwriter" } }} />);
    const link = screen.getByRole("link", { name: /Book a time/ });
    expect(link.getAttribute("href")).toBe("https://calendly.com/arcacover/discovery");
    expect(container.textContent).not.toMatch(/\$\d/);
  });
});
