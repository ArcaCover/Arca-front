// The eight coverages of the AI Professional Malpractice policy, with the
// copy the CCO approved for /coverage. Kept apart from `lib/coverages.ts`,
// which only holds the short names used by the (currently unrendered)
// coverage belt.

export type CoverageDetail = {
  /** Reading order across both groups, shown beside the name. */
  number: string;
  name: string;
  description: string;
  scenario: string;
};

export type CoverageGroupContent = {
  id: string;
  /** Text of the pill above the header. */
  label: string;
  header: string;
  description: string;
  coverages: CoverageDetail[];
};

export const THIRD_PARTY_GROUP: CoverageGroupContent = {
  id: "third-party",
  label: "Third-party",
  header: "When AI errors reach your clients.",
  description:
    "Traditional malpractice policies were written before AI entered professional practice. These four coverages respond when AI-assisted work product causes harm to the people you serve.",
  coverages: [
    {
      number: "01",
      name: "AI Work Product Errors",
      description:
        "Defense and indemnification when AI-generated work product contains errors — fabricated citations, incorrect calculations, flawed analysis — that damage your client's case or interests.",
      scenario:
        "An associate uses ChatGPT to research case law for a motion. Without verifying the output, the associate includes three citations that don't exist. The brief is filed, the court sanctions the firm, and the client's motion is denied. The client sues for malpractice.",
    },
    {
      number: "02",
      name: "AI Regulatory Sanctions",
      description:
        "Defense costs and coverage for fines when a state bar or regulatory body brings disciplinary action against your firm for the way AI was used in professional work.",
      scenario:
        "A solo criminal defense attorney relies on Microsoft Copilot to draft motions and client correspondence across dozens of active cases. A state bar investigation reveals that multiple filings contained unverified AI-generated content. The attorney faces potential suspension and needs defense counsel before the disciplinary board.",
    },
    {
      number: "03",
      name: "AI Bias & Discrimination",
      description:
        "Coverage for claims arising when AI tools produce biased outputs that lead to discriminatory outcomes in the services you provide to clients.",
      scenario:
        "An immigration attorney uses an AI-powered intake platform to assess case strength and prioritize clients. The model's training data underrepresents certain nationalities, and the system systematically scores their asylum claims lower. A denied applicant files a discrimination complaint against the firm.",
    },
    {
      number: "04",
      name: "AI Privacy & Confidentiality Breach",
      description:
        "Coverage when confidential client information is exposed through AI tools — whether by data leakage to a model provider, unintended disclosure in outputs, or breach of attorney-client privilege.",
      scenario:
        "A family law attorney pastes a custody agreement into ChatGPT to generate a quick summary for a colleague. Months later, fragments of the client's personal information surface in the model's responses to unrelated users. The client files a complaint for breach of confidentiality.",
    },
  ],
};

export const FIRST_PARTY_GROUP: CoverageGroupContent = {
  id: "first-party",
  label: "First-party",
  header: "When the cost falls on your firm.",
  description:
    "An AI error doesn't end with the client claim. There's the work you need to redo, the investigation to scope the damage, the clients you need to notify, and the compliance requirements that follow. These four coverages address what it costs your firm to respond.",
  coverages: [
    {
      number: "05",
      name: "Error Remediation",
      description:
        "Covers the costs of identifying, correcting, and re-issuing professional work product that was compromised by AI errors — before or after a client discovers the problem.",
      scenario:
        "A mid-size estate planning firm has been using Harvey to draft trust documents. An attorney notices that the tool introduced incorrect beneficiary language in a recent filing — and the firm has no way to know how many of the documents drafted over the past six months have the same error. They must review every one, correct each, and notify more than thirty clients.",
    },
    {
      number: "06",
      name: "AI Forensic Investigation",
      description:
        "Covers the cost of a forensic audit to determine how far an AI-related error spread — which matters were affected, which filings need correction, and what data may have been exposed.",
      scenario:
        "A personal injury firm that uses CoCounsel for legal research discovers that certain queries have been returning fabricated case citations intermittently. No one knows for how long, or in how many active cases. The firm brings in a forensic team to audit six months of filings across its entire docket.",
    },
    {
      number: "07",
      name: "Crisis Management",
      description:
        "Covers professional crisis response — public relations counsel, client communications, and reputation management — when an AI incident becomes visible to clients or the public.",
      scenario:
        "A local news outlet reports that a personal injury firm filed a brief with citations generated by Google Gemini that turned out to be fabricated. The story goes viral. The firm needs professional crisis communications to manage client relationships, respond to media inquiries, and protect its reputation.",
    },
    {
      number: "08",
      name: "Regulatory Compliance Costs",
      description:
        "Covers the cost of mandatory audits, assessments, and compliance measures imposed by regulators or bar associations in response to an AI-related incident at your firm.",
      scenario:
        "After a bar complaint related to unreviewed Lexis+ AI outputs in court filings, the state disciplinary authority requires the firm to undergo a comprehensive AI governance audit and implement documented controls before it can resume AI-assisted practice. The audit alone takes three weeks and requires outside consultants.",
    },
  ],
};
