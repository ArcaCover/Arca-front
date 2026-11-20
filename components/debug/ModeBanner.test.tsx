// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ModeBanner from "./ModeBanner";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const banner = () => screen.getByRole("status");
const MOCK_MATCH = { state: "match", mode: "mock", webapp: "simulated", billing: "simulated" } as const;
const LIVE_SIMULATED = { state: "match", mode: "live-debug", webapp: "simulated", billing: "simulated" } as const;
const LIVE_REAL = { state: "match", mode: "live-debug", webapp: "real", billing: "test" } as const;

describe("ModeBanner", () => {
  it("shows MOCK on oro with marino stripes drawn from the palette tokens", () => {
    render(<ModeBanner front="mock" check={MOCK_MATCH} />);

    expect(banner().textContent).toBe("MOCK · no real APIs · in-memory data");
    expect(banner().className).toContain("bg-oro");
    const style = banner().getAttribute("style") ?? "";
    expect(style).toContain("repeating-linear-gradient");
    expect(style).toContain("var(--color-marino)");
    expect(style).not.toContain("#");
  });

  // Only the scans and the assessments are real in live-debug: the strip must not call the simulated webapp real.
  it("shows LIVE DEBUG on solid rojo with white text, and says which part is real and which is simulated", () => {
    render(<ModeBanner front="live-debug" check={LIVE_SIMULATED} />);

    expect(banner().textContent).toBe("LIVE DEBUG · real scans · simulated accounts & billing");
    expect(banner().className).toContain("bg-rojo");
    expect(banner().className).toContain("text-white");
    expect(banner().getAttribute("style")).toBeNull();
  });

  // Measured in Chromium at 390x844: this label is 278px wide at the phone size and fits one line beside the State
  // button, so the strip stays inside the 1.5rem /app reserves for it. A longer label wraps and covers the /app header.
  it("keeps the live-debug label short enough for one line on a phone", () => {
    render(<ModeBanner front="live-debug" check={LIVE_SIMULATED} />);

    expect(banner().textContent!.length).toBeLessThanOrEqual(54);
    expect(banner().className).toContain("text-[11px]");
    expect(banner().className).toContain("leading-4");
  });

  // DN-13 §8.4, T19: what the back reports, not the front's build flag: real accounts, and Stripe in test mode.
  it("says the accounts are real and the billing is Stripe test when the back reports so, still on one phone line", () => {
    render(<ModeBanner front="live-debug" check={LIVE_REAL} />);

    expect(banner().textContent).toBe("LIVE DEBUG · real scans · real accounts · Stripe test");
    expect(banner().textContent!.length).toBeLessThanOrEqual(54);
    expect(banner().className).toContain("bg-rojo");
  });

  it("takes the accounts from the back, never from the build flag", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", "true");
    render(<ModeBanner front="live-debug" check={LIVE_SIMULATED} />);

    expect(banner().textContent).toBe("LIVE DEBUG · real scans · simulated accounts & billing");
  });

  it("shows an accounts mismatch like a mode mismatch", () => {
    const label = "ACCOUNTS MISMATCH · front=real, back=simulated";
    render(<ModeBanner front="live-debug" check={{ state: "mismatch", label }} />);

    expect(banner().textContent).toBe(label);
    expect(banner().className).toContain("bg-marino");
    expect(banner().querySelector("svg.lucide-triangle-alert")).not.toBeNull();
    expect(banner().textContent!.length).toBeLessThanOrEqual(54);
  });

  it("shows the mismatch label on marino with oro text and an alert icon", () => {
    const label = "MODE MISMATCH · front=mock, back unreachable or production";
    render(<ModeBanner front="mock" check={{ state: "mismatch", label }} />);

    expect(banner().textContent).toBe(label);
    expect(banner().className).toContain("bg-marino");
    expect(banner().className).toContain("text-oro");
    expect(banner().querySelector("svg.lucide-triangle-alert")).not.toBeNull();
    expect(banner().getAttribute("style")).toBeNull();
  });

  // DN-09 §6.2: the shape and colour are the mode's identity, so they wait for the back's answer as the text does.
  it.each(["mock", "live-debug"] as const)("does not claim %s, in words or looks, while the back has not answered yet", front => {
    render(<ModeBanner front={front} check={null} />);

    expect(banner().textContent).toBe(`Checking the back's mode · front=${front}`);
    expect(banner().className).toContain("bg-bruma");
    expect(banner().className).toContain("text-marino");
    for (const look of ["bg-oro", "bg-rojo", "bg-marino", "text-white", "text-oro"]) expect(banner().className).not.toContain(look);
    expect(banner().getAttribute("style")).toBeNull();
    expect(banner().querySelector(".bg-oro")).toBeNull();
    expect(banner().querySelector("svg")).toBeNull();
  });

  // DN-09 §5.3: a scenario changes the next scan, so while one is armed the strip says so, whatever the state.
  it("names the scenario the next scan injects, next to the mode", () => {
    const armed = ["Bar apify_quota", "Avvo apify_quota"];
    const { rerender } = render(<ModeBanner front="mock" check={MOCK_MATCH} armed={armed} />);
    expect(banner().textContent).toBe("MOCK · no real APIs · in-memory data · next scan injects: Bar apify_quota, Avvo apify_quota");

    rerender(<ModeBanner front="live-debug" check={null} armed={armed} />);
    expect(banner().textContent).toBe("Checking the back's mode · front=live-debug · next scan injects: Bar apify_quota, Avvo apify_quota");

    rerender(<ModeBanner front="live-debug" check={LIVE_SIMULATED} armed={[]} />);
    expect(banner().textContent).toBe("LIVE DEBUG · real scans · simulated accounts & billing");
  });

  it("carries the sentinel the production leak check looks for", () => {
    render(<ModeBanner front="live-debug" check={null} />);

    expect(banner().getAttribute("data-arca-debug")).toBe("arca-debug-sentinel-7f3c");
  });
});
