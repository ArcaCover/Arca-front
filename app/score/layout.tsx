import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component and cannot export metadata, so the
// tab title lives here instead of inheriting the landing page's.
export const metadata: Metadata = {
  title: "Your AI Governance Score — Arca",
};

export default function ScoreLayout({ children }: { children: ReactNode }) {
  return children;
}
