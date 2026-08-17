// Switch to real API: replace MOCK_PRE_SCORE with `await fetch('/api/scan', ...)`
// Response shape defined in ARCA_DEVELOPER_HANDOFF

export const MOCK_PRE_SCORE = {
  firm: {
    name: "Mitchell & Partners LLP",
    domain: "mitchellpartners.com",
    state: "FL",
    practiceArea: "Personal Injury",
    size: 12,
  },
  score: 72,
  tier: 3 as const,
  tierName: "GUARDED" as const,
  confidence: "MEDIUM" as const,
  domains: [
    { id: "d1", name: "AI Governance & Policy", score: 65, weight: "25%" },
    { id: "d2", name: "AI Tool Environment", score: 78, weight: "20%" },
    { id: "d3", name: "Human Oversight & Review", score: 80, weight: "20%" },
    { id: "d4", name: "Data Protection & Confidentiality", score: 70, weight: "15%" },
    { id: "d5", name: "Training & Competency", score: 55, weight: "10%" },
    { id: "d6", name: "Incident Preparedness", score: 60, weight: "10%" },
  ],
  signals: [
    { id: "s1", label: "AI usage policy found on website", source: "Website scan", positive: true },
    { id: "s2", label: "Uses enterprise-grade AI tools (Lexis+ AI)", source: "Tech stack", positive: true },
    { id: "s3", label: "DMARC record configured", source: "DNS scan", positive: true },
    { id: "s4", label: "No AI training program mentioned", source: "Website scan", positive: false },
    { id: "s5", label: "No incident response plan detected", source: "Website scan", positive: false },
    { id: "s6", label: "Bar standing: active, no disciplinary actions", source: "Regulatory check", positive: true },
    { id: "s7", label: "AI-related job postings found", source: "Job boards", positive: true },
    { id: "s8", label: "Client data handling policy not found", source: "Website scan", positive: false },
  ],
};

export type PreScoreData = typeof MOCK_PRE_SCORE;
export type DomainScore = PreScoreData["domains"][number];
export type Signal = PreScoreData["signals"][number];
