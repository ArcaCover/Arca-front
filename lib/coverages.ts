// The eight coverages of AI Professional Malpractice, grouped by who bears the
// loss. Single source of truth so the hero marquee and the products section can
// never drift apart.
// TODO: confirm coverage wording with counsel before launch
export const COVERAGE_GROUPS = [
  {
    id: "third-party",
    label: "Third-party",
    blurb: "When your client is the one harmed.",
    items: [
      "AI Work Product Errors",
      "AI Regulatory Sanctions",
      "AI Bias & Discrimination",
      "AI Privacy & Confidentiality Breach",
    ],
  },
  {
    id: "first-party",
    label: "First-party",
    blurb: "Your own costs to put it right.",
    items: [
      "Error Remediation",
      "AI Forensic Investigation",
      "Crisis Management",
      "Regulatory Compliance Costs",
    ],
  },
];

// Flat list for the hero marquee, third-party first.
export const COVERAGES = COVERAGE_GROUPS.flatMap((group) => group.items);
