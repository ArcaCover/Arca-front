import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AI Professional Malpractice Coverage | Arca",
  description:
    "Eight coverages for the risks AI creates in your practice. See what's covered when AI-assisted work goes wrong.",
};

export default function CoverageLayout({ children }: { children: ReactNode }) {
  return children;
}
