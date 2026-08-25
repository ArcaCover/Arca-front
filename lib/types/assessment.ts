// Contract with the Score Engine API (Layer 2 of the questionnaire).
//
//   GET  /assessment/{scan_id}/questions  -> AssessmentQuestionsResponse
//   POST /assessment/{scan_id}/submit     <- AssessmentSubmission
//
// These are the shapes the backend owns, so they live apart from the mock
// data that stands in for it today (lib/mock/assessment-questions.ts).

export type QuestionType = "single_select" | "multi_select";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface AssessmentQuestion {
  id: string;
  order: number;
  /** One of the six scoring domains: governance, tools, oversight,
      data_protection, training, incident_preparedness. */
  domain: string;
  /** The domain spelled out for the reader, e.g. "AI Governance & Policy". */
  domain_label: string;
  text: string;
  /** What Layer 1 already found, when it changes how the question reads. */
  context: string | null;
  type: QuestionType;
  options: QuestionOption[];
  info_tooltip: string | null;
  /** The question Layer 1 made unnecessary, and why. Shown as credit for the
      time the scan saved, not as something the user has to act on. */
  skipped_question: string | null;
  skip_reason: string | null;
}

export interface AssessmentQuestionsResponse {
  scan_id: string;
  total_questions: number;
  estimated_minutes: number;
  questions: AssessmentQuestion[];
}

export interface AssessmentResponse {
  question_id: string;
  /** A single option id for single_select, a list of them for multi_select. */
  answer: string | string[];
}

export interface AssessmentSubmission {
  responses: AssessmentResponse[];
}
