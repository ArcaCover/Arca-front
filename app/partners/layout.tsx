import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Partners — Arca",
  description:
    "Partner with Arca to offer AI liability coverage for law firms, with pre-qualified leads and a broker dashboard.",
};

export default function PartnersLayout({ children }: { children: ReactNode }) {
  return children;
}
