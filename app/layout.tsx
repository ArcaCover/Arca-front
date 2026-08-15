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

const TITLE = "Arca: AI Liability Insurance for the Legal Industry";
const DESCRIPTION =
  "Arca covers what your professional liability policy doesn't: malpractice, faulty automated decisions, and regulatory exposure from the AI tools you already use.";

// Share cards need absolute URLs, so the relative image below is resolved
// against this. TODO: set NEXT_PUBLIC_SITE_URL to the real domain before launch
// — without it the card points at localhost and no scraper can fetch it.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Arca — coverage for the mistakes AI makes in your name.",
};

// A plain string title, deliberately not a template, so nothing is appended
// to it in the browser tab or in search results.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // The SVG comes first so browsers that support it scale the mark cleanly at
  // any density; the .ico carries every legacy size and closes the list.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "512x512" },
  },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Arca",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${mulish.variable}`}>
      <body>{children}</body>
    </html>
  );
}
