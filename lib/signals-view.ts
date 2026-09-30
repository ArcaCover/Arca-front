import type { Layer1Result } from "@arca/contracts";

// Turning the engine's signals into sentences is copy, not scoring. Every card is anchored to
// a rule the engine actually scored, and `positive` comes from the sign of that rule's points,
// so the front never decides on its own whether a finding is good or bad. A rule the engine
// could not evaluate (points === null) produces no card: we say nothing rather than guess.

export type SignalView = {
  id: string;
  label: string;
  source: string;
  positive: boolean;
};

type Signals = Layer1Result["signals"];

const WEBSITE = "Website scan";
const BAR = "Florida Bar";
const AVVO = "Avvo";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const rounded = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** One entry per scoring rule. `label` returns null when the evidence cannot be phrased
    honestly, which drops the card rather than shipping a vague one. */
const DESCRIPTORS: Array<{ rule: string; source: string; label: (s: Signals) => string | null }> = [
  {
    rule: "W1",
    source: WEBSITE,
    label: ({ website }) => {
      const { found, depth } = website.W1_aiPolicy;
      if (found === null) return null;
      if (!found) return depth === "mention_only"
        ? "AI is mentioned on the website, but no usage policy is published"
        : "No AI usage policy found on the website";
      return depth === "comprehensive"
        ? "Comprehensive AI usage policy published on the website"
        : "AI usage policy published on the website";
    },
  },
  {
    rule: "W2",
    source: WEBSITE,
    label: ({ website }) => {
      const { found, tools } = website.W2_aiInServices;
      if (found === null) return null;
      if (!found) return "No AI tooling named in client-facing services";
      const named = tools?.length ? `: ${tools.slice(0, 3).join(", ")}` : "";
      return `AI tooling named in client-facing services${named}`;
    },
  },
  {
    rule: "W3",
    source: WEBSITE,
    label: ({ website }) => website.W3_aiDisclosure.found === null ? null
      : website.W3_aiDisclosure.found
        ? "Client-facing AI disclosure published"
        : "No client-facing AI disclosure found",
  },
  {
    rule: "W4",
    source: WEBSITE,
    label: ({ website }) => {
      const { found, count } = website.W4_aiBlog;
      if (found === null) return null;
      if (!found) return "No AI-related writing published";
      return count ? `${count} AI-related article${count === 1 ? "" : "s"} published` : "AI-related writing published";
    },
  },
  {
    rule: "W6",
    source: WEBSITE,
    label: ({ website }) => {
      const { found, mentionsClientData } = website.W6_privacyPolicy;
      if (found === false) return "No privacy policy found on the website";
      if (found === true && mentionsClientData === false) return "Privacy policy does not cover client data";
      if (found === true && mentionsClientData === true) return "Privacy policy covers client data handling";
      return null;
    },
  },
  {
    rule: "W7",
    source: WEBSITE,
    label: ({ website }) => {
      const quality = website.W7_websiteQuality;
      if (quality === null) return null;
      if (quality === "robust") return "Substantial public website";
      if (quality === "minimal") return "Minimal public website";
      return "Standard public website";
    },
  },
  {
    rule: "W5a",
    source: WEBSITE,
    label: ({ website }) => {
      const quality = website.W5a_teamPageQuality;
      if (quality === null) return null;
      if (quality === "detailed") return "Detailed team page with attorney profiles";
      if (quality === "no_team_page") return "No team page published";
      return "Team page lists names only";
    },
  },
  {
    rule: "W8",
    source: WEBSITE,
    label: ({ website }) => website.W8_firmEstablished === null ? null
      : `Firm established in ${website.W8_firmEstablished}`,
  },
  {
    rule: "W9_A2",
    source: WEBSITE,
    label: ({ website, avvo }) => website.W9_practiceAreas === null || avvo.A2_practiceAreas === null ? null
      : "Practice areas on the website match the directory record",
  },
  {
    rule: "B1",
    source: BAR,
    label: ({ bar }) => bar.B1_allActive === null ? null
      : bar.B1_allActive
        ? "Every matched attorney is in active bar standing"
        : "At least one matched attorney is not in active standing",
  },
  {
    rule: "B2_clean",
    source: BAR,
    label: ({ bar }) => bar.B2_worstDisciplinary === null ? null
      : bar.B2_worstDisciplinary === "none"
        ? "No disciplinary history on record"
        : `Disciplinary history on record: ${bar.B2_worstDisciplinary}`,
  },
  {
    rule: "B2_sanction",
    source: BAR,
    label: ({ bar }) => bar.B2_worstDisciplinary && bar.B2_worstDisciplinary !== "none"
      ? `Recent sanction on record: ${bar.B2_worstDisciplinary}`
      : null,
  },
  {
    rule: "B3",
    source: BAR,
    label: ({ bar }) => bar.B3_consistency === null ? null
      : `${percent(bar.B3_consistency)} of the firm's attorneys matched a bar record`,
  },
  {
    rule: "B4",
    source: BAR,
    label: ({ bar }) => bar.B4_avgExperience === null ? null
      : `${rounded(bar.B4_avgExperience)} years average time since admission`,
  },
  {
    rule: "A1",
    source: AVVO,
    label: ({ avvo }) => avvo.A1_avgRating === null ? null
      : `Average peer rating of ${rounded(avvo.A1_avgRating)} out of 10`,
  },
  {
    rule: "A3",
    source: AVVO,
    label: ({ avvo }) => {
      const { A3_avgReviewRating: rating, A3_totalReviews: total } = avvo;
      if (rating === null || total === null) return null;
      if (total === 0) return "No client reviews published";
      return `${total} client review${total === 1 ? "" : "s"}, averaging ${rounded(rating)} out of 5`;
    },
  },
  {
    rule: "A6",
    source: AVVO,
    label: ({ avvo }) => {
      if (avvo.A6_hasAwards === null) return null;
      if (!avvo.A6_hasAwards) return "No peer awards recorded";
      return avvo.A6_topAward ? `Peer award: ${avvo.A6_topAward}` : "Peer awards recorded";
    },
  },
];

export function signalsToCards(result: Layer1Result): SignalView[] {
  // The engine already decided what each rule was worth. Collect those verdicts once.
  const points = new Map<string, number>();
  for (const category of Object.values(result.preScore.categories)) {
    for (const rule of category.rules) {
      if (rule.points !== null) points.set(rule.id, rule.points);
    }
  }

  const cards: SignalView[] = [];
  for (const descriptor of DESCRIPTORS) {
    const score = points.get(descriptor.rule);
    if (score === undefined) continue;
    const label = descriptor.label(result.signals);
    if (label === null) continue;
    cards.push({ id: descriptor.rule, label, source: descriptor.source, positive: score > 0 });
  }

  // What is carrying the score reads first, the same order the screen used with mock data.
  return [...cards.filter(card => card.positive), ...cards.filter(card => !card.positive)];
}
