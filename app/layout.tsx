import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Mulish, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-mulish",
});

// TODO: review SEO copy before launch (quote flow not live yet)
const TITLE =
  "Arca: AI Liability Insurance for Law, Accounting & Consulting Firms";
const DESCRIPTION =
  "Your professional liability policy was written before AI. Arca covers the gap: malpractice, faulty automated decisions, and regulatory exposure from the AI tools you already use. Get a quote in minutes.";

// A plain string title, deliberately not a template, so nothing is appended
// to it in the browser tab or in search results.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    // TODO: add OG image before launch
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${mulish.variable}`}>
      <body>{children}</body>
    </html>
  );
}
