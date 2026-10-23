// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ModeBanner from "./ModeBanner";

afterEach(cleanup);

const banner = () => screen.getByRole("status");

describe("ModeBanner", () => {
  it("shows MOCK on oro with marino stripes drawn from the palette tokens", () => {
    render(<ModeBanner front="mock" check={{ state: "match", mode: "mock" }} />);

    expect(banner().textContent).toBe("MOCK · no real APIs · in-memory data");
    expect(banner().className).toContain("bg-oro");
    const style = banner().getAttribute("style") ?? "";
    expect(style).toContain("repeating-linear-gradient");
    expect(style).toContain("var(--color-marino)");
    expect(style).not.toContain("#");
  });

  it("shows LIVE DEBUG on solid rojo with white text", () => {
    render(<ModeBanner front="live-debug" check={{ state: "match", mode: "live-debug" }} />);

    expect(banner().textContent).toBe("LIVE DEBUG · real APIs & real database");
    expect(banner().className).toContain("bg-rojo");
    expect(banner().className).toContain("text-white");
    expect(banner().getAttribute("style")).toBeNull();
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

  it("does not claim a mode while the back has not answered yet", () => {
    render(<ModeBanner front="mock" check={null} />);

    expect(banner().textContent).toBe("Checking the back's mode · front=mock");
  });

  it("carries the sentinel the production leak check looks for", () => {
    render(<ModeBanner front="live-debug" check={null} />);

    expect(banner().getAttribute("data-arca-debug")).toBe("arca-debug-sentinel-7f3c");
  });
});
