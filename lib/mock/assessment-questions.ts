// Switch to real API: replace MOCK_ASSESSMENT_QUESTIONS with
// `await fetch('/assessment/{scan_id}/questions')`.
// Response shape defined in lib/types/assessment.ts.
//
// The scenario: a Layer 1 scan that found a published AI policy and Clio in
// the tech stack. Those two findings are what let the engine drop Q1.1 and
// Q2.1 from the bank of 20 and ask the follow-up instead.
//
// TODO: reconcile the wording of each question and option with the question
// bank in ARCA_DEVELOPER_HANDOFF before this goes in front of a real firm.
// The selection logic below follows the handoff; the prose is written here.

import type { AssessmentQuestionsResponse } from "@/lib/types/assessment";

export const MOCK_ASSESSMENT_QUESTIONS: AssessmentQuestionsResponse = {
  scan_id: "scan_mock_001",
  total_questions: 10,
  estimated_minutes: 5,
  questions: [
    {
      id: "Q1.2",
      order: 1,
      domain: "governance",
      domain_label: "AI Governance & Policy",
      text: "How far does that policy reach?",
      context:
        "We detected that your firm has an AI policy published on its website.",
      type: "single_select",
      options: [
        { id: "a", text: "Everyone at the firm, for every AI tool they use" },
        { id: "b", text: "Everyone at the firm, but only for the tools we approved" },
        { id: "c", text: "Attorneys only" },
        { id: "d", text: "It is written, but we have not rolled it out yet" },
      ],
      info_tooltip: null,
      skipped_question: "Q1.1 — Does your firm have a written AI usage policy?",
      skip_reason: "Your website publishes one, so we did not need to ask.",
    },
    {
      id: "Q1.3",
      order: 2,
      domain: "governance",
      domain_label: "AI Governance & Policy",
      text: "Who owns AI governance at your firm?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "A named partner or committee, as a formal responsibility" },
        { id: "b", text: "A named person, informally, on top of their day job" },
        { id: "c", text: "IT or an outside vendor" },
        { id: "d", text: "No one owns it specifically" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q2.2",
      order: 3,
      domain: "tools",
      domain_label: "AI Tool Environment",
      text: "Beyond Clio, what does your team use for client work?",
      context:
        "Your tech stack shows Clio, so we already know your matters live in a managed platform.",
      type: "multi_select",
      options: [
        { id: "a", text: "Legal research AI (Lexis+ AI, Westlaw Precision, CoCounsel)" },
        { id: "b", text: "Business or enterprise accounts of general AI assistants" },
        { id: "c", text: "Personal or free accounts of general AI assistants" },
        { id: "d", text: "Microsoft Copilot inside our own tenant" },
        { id: "e", text: "Transcription or meeting-notes tools" },
        { id: "f", text: "Nothing beyond Clio" },
      ],
      info_tooltip:
        "A business or enterprise account carries contractual terms: your prompts stay out of the vendor's training data and the firm controls retention. A personal or free account usually offers neither.",
      skipped_question: "Q2.1 — Which AI tools does your firm use?",
      skip_reason: "We detected Clio in your tech stack, so we started from there.",
    },
    {
      id: "Q2.3",
      order: 4,
      domain: "tools",
      domain_label: "AI Tool Environment",
      text: "Does client-identifying information ever go into those tools?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "Never — we redact names and details first" },
        { id: "b", text: "Only into tools covered by a signed no-training agreement" },
        { id: "c", text: "Yes, into business accounts, without a formal review" },
        { id: "d", text: "Yes, including into personal or free accounts" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q3.1",
      order: 5,
      domain: "oversight",
      domain_label: "Human Oversight & Review",
      text: "Who reviews AI-assisted work before it leaves the firm?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "A licensed attorney reviews all of it, every time" },
        { id: "b", text: "A licensed attorney reviews filings and client deliverables only" },
        { id: "c", text: "The person who drafted it decides whether review is needed" },
        { id: "d", text: "There is no separate review step" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q3.2",
      order: 6,
      domain: "oversight",
      domain_label: "Human Oversight & Review",
      text: "How do you verify citations and factual claims that AI produced?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "Every one is checked against the primary source, and the check is recorded" },
        { id: "b", text: "Every one is checked, but nothing is recorded" },
        { id: "c", text: "We spot-check the ones that look unusual" },
        { id: "d", text: "We rely on the citations the tool provides" },
      ],
      info_tooltip:
        "Recording the check matters as much as running it: if the work is ever questioned, a record is what shows the review happened.",
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q4.1",
      order: 7,
      domain: "data_protection",
      domain_label: "Data Protection & Confidentiality",
      text: "Which of these controls does your firm have in place today?",
      context: null,
      type: "multi_select",
      // "None of these" is exclusive with the rest. Enforcing that is the
      // page's job, not the card's — see the assessment page (Prompt 5).
      options: [
        { id: "a", text: "Signed vendor agreements covering confidentiality and model training" },
        { id: "b", text: "Client data is redacted or anonymized before it reaches any AI tool" },
        { id: "c", text: "Engagement-letter language covering how we use AI" },
        { id: "d", text: "Access controls over who can connect AI tools to firm systems" },
        { id: "e", text: "None of these are formally in place" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q5.1",
      order: 8,
      domain: "training",
      domain_label: "Training & Competency",
      text: "What AI training does your team receive?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "Formal training at onboarding, refreshed at least once a year" },
        { id: "b", text: "One session when we adopted the tools" },
        { id: "c", text: "Guidance shared informally, as questions come up" },
        { id: "d", text: "None" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q6.1",
      order: 9,
      domain: "incident_preparedness",
      domain_label: "Incident Preparedness",
      text: "Has an AI-related error ever affected your work product?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "No" },
        { id: "b", text: "Yes, and we caught it before it left the firm" },
        { id: "c", text: "Yes — it reached a client or a filing, and we corrected it" },
        { id: "d", text: "Yes, and it led to a complaint, sanction, or claim" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
    {
      id: "Q6.2",
      order: 10,
      domain: "incident_preparedness",
      domain_label: "Incident Preparedness",
      text: "If an AI error reached a client tomorrow, what would you follow?",
      context: null,
      type: "single_select",
      options: [
        { id: "a", text: "A written plan with named roles and client-notification steps" },
        { id: "b", text: "A written incident plan that does not cover AI specifically" },
        { id: "c", text: "We would handle it, but nothing is written down" },
        { id: "d", text: "We have not thought it through" },
      ],
      info_tooltip: null,
      skipped_question: null,
      skip_reason: null,
    },
  ],
};
