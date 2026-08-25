import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Platforms — Arca",
  description:
    "Embed AI liability scoring, quoting and binding into your legal tech platform with one API.",
};

export default function PlatformsLayout({ children }: { children: ReactNode }) {
  return children;
}
