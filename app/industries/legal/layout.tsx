import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Legal — Industries — Arca",
  description:
    "AI liability coverage built for U.S. law firms: what is changing in legal practice, why the sector is uniquely exposed, and who Arca works with.",
};

export default function LegalIndustryLayout({ children }: { children: ReactNode }) {
  return children;
}
