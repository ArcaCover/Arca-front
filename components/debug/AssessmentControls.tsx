"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { recallAssessment } from "@/lib/api/assessment-session";
import { completeAssessment } from "@/lib/api/client";
import { recallSession } from "@/lib/api/session";
import { assessmentHref } from "@/lib/assessment";
import { autoAnswer } from "@/lib/debug/auto-answer";

// Shortcuts through the assessment (DN-09 §6.4). Both go through the normal API with this tab's scan token and the
// assessment it remembers, so the server checks them exactly as it checks a person's answers.
type Access = { token: string; assessmentId: string };

const BUTTON = "rounded-full bg-marino px-3 py-1 font-semibold text-white disabled:opacity-50";

export default function AssessmentControls({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On success the page reloads or navigates away, so `busy` is only cleared after a failure.
  async function run(action: (access: Access) => Promise<void>) {
    const token = recallSession(scanId);
    const assessmentId = recallAssessment(scanId);
    if (!token || !assessmentId) {
      setError("This tab holds no session or assessment for this scan");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await action({ token, assessmentId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed");
      setBusy(false);
    }
  }

  async function answerAll({ token, assessmentId }: Access) {
    await autoAnswer(assessmentId, token);
    // The page keeps its own copy of the assessment, so it reloads to read the saved answers back from the API.
    location.reload();
  }

  async function attestAndComplete({ token, assessmentId }: Access) {
    // completeAssessment sends the attestation itself, as the page does once its checkbox is ticked.
    await completeAssessment(assessmentId, token);
    router.push(assessmentHref(scanId, assessmentId, true));
  }

  return (
    <div className="mt-3 border-t border-bruma pt-3">
      <p className="font-semibold">Assessment shortcuts</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void run(answerAll)} className={BUTTON}>
          Auto-answer
        </button>
        <button type="button" disabled={busy} onClick={() => void run(attestAndComplete)} className={BUTTON}>
          Attest &amp; complete
        </button>
      </div>
      {error && <p className="mt-2 text-rojo">{error}</p>}
    </div>
  );
}
