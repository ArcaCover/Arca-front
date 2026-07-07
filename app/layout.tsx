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

export const metadata: Metadata = {
  title: "Arca — Insurance for businesses that rely on AI",
  description:
    "Arca covers the new risks that come with relying on AI — from model failures to liability for automated decisions.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${mulish.variable}`}>
      <body>{children}</body>
    </html>
  );
}
