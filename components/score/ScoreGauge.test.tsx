// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ScoreGauge from "./ScoreGauge";

afterEach(cleanup);

const arcs = () => screen.getByRole("img").querySelectorAll("path").length;

describe("ScoreGauge", () => {
  it("draws the track and a filled arc for a score", () => {
    render(<ScoreGauge score={21} tier="CRITICAL" />);

    expect(screen.getByRole("img", { name: "AI Governance Score: 21 out of 100" })).toBeTruthy();
    expect(arcs()).toBe(2);
  });

  it("shows a zero as a number over an empty track, with no arc to mistake for a score", () => {
    render(<ScoreGauge score={0} tier="CRITICAL" />);

    expect(screen.getByRole("img", { name: "AI Governance Score: 0 out of 100" })).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(arcs()).toBe(1);
  });

  it("leaves an unscored result without a number or an arc", () => {
    render(<ScoreGauge score={null} tier="UNKNOWN" />);

    expect(screen.getByRole("img", { name: "AI Governance Score: not enough evidence to score" })).toBeTruthy();
    expect(arcs()).toBe(1);
  });
});
