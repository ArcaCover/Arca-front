// TODO: replace with real testimonials before launch — all data below is mock/placeholder
// Firms, quotes and metrics are invented for design purposes. Arca has no carrier
// and has bound no policies, so none of these claims can ship to production.

// Accent for the initials tile. Named tokens only — never a raw hex here.
export type AccentToken = "marino" | "cielo" | "oro-oscuro";

export type Testimonial = {
  id: string;
  firmName: string;
  headline: string;
  metrics: { value: string; label: string }[];
  quote: string;
  author: string;
  accentToken: AccentToken;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "northwind-legal",
    firmName: "Northwind Legal",
    headline: "How Northwind Legal contained AI hallucination risk",
    metrics: [
      { value: "$2.5M", label: "Coverage limit secured" },
      { value: "100%", label: "Audit trail compliance" },
    ],
    quote:
      "We were drafting with AI months before anyone asked who covers it. Arca answered that in an afternoon.",
    author: "Jordan Ellis, Managing Partner",
    accentToken: "marino",
  },
  {
    id: "vanguard-legal-group",
    firmName: "Vanguard Legal Group",
    headline: "How Vanguard Legal Group put a review process behind every AI draft",
    metrics: [
      { value: "18 pts", label: "Governance score gain" },
      { value: "6 days", label: "From scan to bound" },
    ],
    quote:
      "The assessment found gaps our own partners had missed. Fixing them lowered what we pay.",
    author: "Priya Shah, Chief Legal Officer",
    accentToken: "cielo",
  },
  {
    id: "apex-partners-law",
    firmName: "Apex Partners Law",
    headline: "How Apex Partners Law covered the work its AI tools touch",
    metrics: [
      { value: "42", label: "Attorneys covered" },
      { value: "3 hrs", label: "Total partner time spent" },
    ],
    quote:
      "Our old E&O policy went quiet on AI. This one says exactly what happens when a tool gets it wrong.",
    author: "Daniel Rees, Head of Risk",
    accentToken: "oro-oscuro",
  },
];
