"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";
import { ArcaWordmark } from "./brand/ArcaWordmark";
import NavDropdown from "./NavDropdown";

const COVERAGES = [{ label: "AI Professional Malpractice", href: "#products" }];

const PARTNERS = [
  { label: "Producers", href: "/partners" },
  { label: "Platforms", href: "/partners#platforms" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 30);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      <nav className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center px-6 text-marino md:px-8">
        {/* Left zone: dropdown menus (desktop) / hamburger (mobile) */}
        <div className="hidden items-center gap-10 md:flex">
          <NavDropdown label="Coverages">
            <ul className="space-y-3">
              {COVERAGES.map((coverage) => (
                <li key={coverage.label}>
                  <a
                    href={coverage.href}
                    className="whitespace-nowrap text-sm font-semibold text-marino hover:text-oro-oscuro"
                  >
                    {coverage.label}
                  </a>
                </li>
              ))}
            </ul>
          </NavDropdown>
          <NavDropdown label="Industries">
            <ul className="space-y-3">
              {INDUSTRIES.map((industry) => (
                <li key={industry}>
                  <a
                    href="#"
                    className="whitespace-nowrap text-sm font-semibold text-marino hover:text-oro-oscuro"
                  >
                    {industry}
                  </a>
                </li>
              ))}
            </ul>
          </NavDropdown>
          <NavDropdown label="Partners">
            <ul className="space-y-3">
              {PARTNERS.map((partner) => (
                <li key={partner.label}>
                  <a
                    href={partner.href}
                    className="whitespace-nowrap text-sm font-semibold text-marino hover:text-oro-oscuro"
                  >
                    {partner.label}
                  </a>
                </li>
              ))}
            </ul>
          </NavDropdown>
        </div>
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="justify-self-start text-current md:hidden"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
            {mobileOpen ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>

        {/* Center zone: logo — large and floating over the hero, shrinks up on scroll */}
        <a
          href="#top"
          className={`justify-self-center transition-transform duration-300 ${
            scrolled ? "translate-y-0" : "translate-y-5 md:translate-y-7"
          }`}
        >
          {/* Height drives the mark, so the two states are set here rather than
              through the font sizes the old text logo used. */}
          <ArcaWordmark
            className={`w-auto text-marino transition-[height] duration-300 ${
              scrolled ? "h-5 md:h-6" : "h-7 md:h-9"
            }`}
          />
        </a>

        {/* Right zone: [My account] [Get a quote (appears on scroll)] */}
        <div className="flex items-center justify-self-end">
          <a
            href="#"
            className="hidden whitespace-nowrap text-sm font-semibold text-current transition-opacity hover:opacity-75 md:block"
          >
            My account
          </a>
          <Link
            href="/quote"
            aria-hidden={!scrolled}
            tabIndex={scrolled ? 0 : -1}
            className={`block cursor-pointer overflow-hidden whitespace-nowrap rounded-full bg-oro text-sm font-bold text-marino transition-all duration-300 hover:bg-oro-oscuro ${
              scrolled
                ? "ml-0 max-w-40 px-4 py-2 opacity-100 md:ml-4"
                : "pointer-events-none ml-0 max-w-0 px-0 py-2 opacity-0"
            }`}
          >
            Get a quote
          </Link>
        </div>
      </nav>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-marino/10 bg-white px-6 py-4 shadow-md md:hidden">
          <details className="py-2">
            <summary className="cursor-pointer text-sm font-bold text-marino">
              Coverages
            </summary>
            <ul className="mt-2 space-y-2 pl-4">
              {COVERAGES.map((coverage) => (
                <li key={coverage.label}>
                  <a
                    href={coverage.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-semibold text-marino"
                  >
                    {coverage.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <details className="py-2">
            <summary className="cursor-pointer text-sm font-bold text-marino">
              Industries
            </summary>
            <ul className="mt-2 space-y-2 pl-4">
              {INDUSTRIES.map((industry) => (
                <li key={industry}>
                  <a
                    href="#"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-semibold text-marino"
                  >
                    {industry}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <details className="py-2">
            <summary className="cursor-pointer text-sm font-bold text-marino">
              Partners
            </summary>
            <ul className="mt-2 space-y-2 pl-4">
              {PARTNERS.map((partner) => (
                <li key={partner.label}>
                  <a
                    href={partner.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-semibold text-marino"
                  >
                    {partner.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <a
            href="#"
            className="block py-2 text-sm font-bold text-marino"
            onClick={() => setMobileOpen(false)}
          >
            My account
          </a>
          {/* The panel covers the gold CTA in the bar above it, so without this
              a phone user who opens the menu has no way through to a quote. */}
          <Link
            href="/quote"
            className="mt-3 block rounded-full bg-oro py-3 text-center text-sm font-bold text-marino transition-colors hover:bg-oro-oscuro"
            onClick={() => setMobileOpen(false)}
          >
            Get a quote
          </Link>
        </div>
      )}
    </header>
  );
}
