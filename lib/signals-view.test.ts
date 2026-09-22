import { describe, expect, it } from "vitest";

import { fixtureResult } from "@/lib/api/fixture";
import { signalsToCards } from "@/lib/signals-view";

describe("signalsToCards", () => {
  it("takes the verdict from the rule's points, never from the signal itself", () => {
    const cards = signalsToCards(fixtureResult());

    // W1 scored 8 points, so the policy card is positive.
    expect(cards.find(card => card.id === "W1")).toEqual({
      id: "W1",
      label: "AI usage policy published on the website",
      source: "Website scan",
      positive: true,
    });
    // W3 scored 0: the disclosure was looked for and not found.
    expect(cards.find(card => card.id === "W3")?.positive).toBe(false);
  });

  it("says nothing about a rule the engine could not evaluate", () => {
    const result = fixtureResult();
    const cards = signalsToCards(
      fixtureResult({
        preScore: {
          ...result.preScore,
          categories: {
            ...result.preScore.categories,
            aiGovernance: {
              ...result.preScore.categories.aiGovernance,
              status: "PARTIAL",
              rules: [{ id: "W1", points: null, reason: "Evidence unavailable or ambiguous" }],
            },
          },
        },
      }),
    );

    // A rule with null points produces no card at all: we do not guess a verdict.
    expect(cards.some(card => card.id === "W1")).toBe(false);
    expect(cards.some(card => card.id === "W2")).toBe(false);
  });

  it("drops a scored rule whose signal cannot be phrased honestly", () => {
    const result = fixtureResult();
    const cards = signalsToCards(
      fixtureResult({
        signals: {
          ...result.signals,
          website: { ...result.signals.website, W1_aiPolicy: { found: null, depth: null, points: 8 } },
        },
      }),
    );

    // The rule scored, but with `found` unknown there is no true sentence to write.
    expect(cards.some(card => card.id === "W1")).toBe(false);
  });

  it("reads what is carrying the score first", () => {
    const cards = signalsToCards(fixtureResult());
    const firstNegative = cards.findIndex(card => !card.positive);
    const lastPositive = cards.map(card => card.positive).lastIndexOf(true);

    expect(firstNegative).toBeGreaterThan(lastPositive);
  });

  it("counts and pluralises what it reports", () => {
    const cards = signalsToCards(fixtureResult());

    expect(cards.find(card => card.id === "W4")?.label).toBe("2 AI-related articles published");
    expect(cards.find(card => card.id === "A3")?.label).toBe("20 client reviews, averaging 4.5 out of 5");
    expect(cards.find(card => card.id === "B3")?.label).toBe("100% of the firm's attorneys matched a bar record");
  });
});
