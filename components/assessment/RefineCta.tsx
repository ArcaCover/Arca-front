"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { startAssessment } from "@/lib/api/client";
import { recallSession } from "@/lib/api/session";
import {
  recallAssessment,
  rememberAssessment,
} from "@/lib/api/assessment-session";
import { assessmentHref } from "@/lib/assessment";

export default function RefineCta({ scanId }: { scanId: string }) {
  const router = useRouter();
  const pending = useRef<Promise<string> | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  const openingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const token = recallSession(scanId);
    if (token && !recallAssessment(scanId) && !pending.current) {
      pending.current = startAssessment(scanId, token).then((started) => {
        rememberAssessment(scanId, started.assessmentId);
        return started.assessmentId;
      });
      // Preloading is optional; an explicit click gets a visible retry path.
      void pending.current.catch(() => {
        pending.current = null;
      });
    }
    return () => {
      mounted.current = false;
    };
  }, [scanId]);

  async function open() {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setError(false);
    try {
      const token = recallSession(scanId);
      if (!token) {
        router.push("/quote");
        return;
      }
      const saved = recallAssessment(scanId);
      const id =
        saved ??
        (await (pending.current ??
          startAssessment(scanId, token).then(
            (started) => started.assessmentId,
          )));
      if (!id) throw new Error("Assessment ID was not returned");
      rememberAssessment(scanId, id);
      if (mounted.current) router.push(assessmentHref(scanId, id));
    } catch {
      if (mounted.current) setError(true);
      pending.current = null;
    } finally {
      openingRef.current = false;
      if (mounted.current) setOpening(false);
    }
  }

  return (
    <div className="w-full rounded-[28px] border border-cielo/20 bg-bruma/40 p-6 text-center sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-marino/70">
        Go a little deeper
      </p>
      <h2 className="mt-3 font-heading text-2xl font-medium tracking-tight text-marino">
        There’s more to your story.
      </h2>
      <p className="mx-auto mt-3 max-w-[470px] text-sm leading-7 text-marino/70">
        Tell us how your team actually works with AI. A short, adaptive
        assessment brings six areas of governance into focus.
      </p>
      <button
        type="button"
        onClick={() => void open()}
        disabled={opening}
        className="cta-glow group mt-6 inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[16px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marino disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        {opening ? "Opening assessment…" : "Refine your score"}
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white">
          {opening ? (
            <Loader2
              aria-hidden
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ArrowRight aria-hidden className="h-4 w-4" />
          )}
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rojo">
          We couldn’t open your assessment. Please try again.
        </p>
      )}
      <p className="mt-4 text-xs leading-6 text-marino/70">
        Demo business rules · 8 core questions plus relevant follow-ups
        <br />
        Illustrative scores only. No coverage, pricing, or underwriting
        decision.
      </p>
    </div>
  );
}
