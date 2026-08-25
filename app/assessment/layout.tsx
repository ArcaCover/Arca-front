import type { Metadata } from "next";
import type { ReactNode } from "react";

// The pages below are client components and cannot export metadata, so the
// tab title lives here instead of inheriting the landing page's.
export const metadata: Metadata = {
  title: "Your AI Governance Assessment — Arca",
};

export default function AssessmentLayout({ children }: { children: ReactNode }) {
  return children;
}
