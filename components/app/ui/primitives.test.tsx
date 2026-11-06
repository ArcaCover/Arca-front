// @vitest-environment jsdom
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { LockedState, ReadOnlyNotice } from "@/components/app/ui";

vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));

afterEach(cleanup);

describe("ReadOnlyNotice", () => {
  it("says who can make the change in one line, with an icon that assistive tech skips", () => {
    render(<ReadOnlyNotice>Only the owner can manage billing.</ReadOnlyNotice>);
    const notice = screen.getByText("Only the owner can manage billing.");
    expect(notice.tagName).toBe("P");
    const icon = notice.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("LockedState", () => {
  it("asks a role that can pay to choose a plan", () => {
    render(<LockedState feature="monitoring" />);
    expect(screen.getByRole("heading", { name: "Choose a plan to unlock monitoring" })).toBeTruthy();
    expect(screen.getByText("Your organization's workspace opens once a plan is active.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "See plans" }).getAttribute("href")).toBe("/app/billing");
  });

  it("tells a role that cannot pay that the owner chooses the plan, and links to the billing status", () => {
    render(<LockedState feature="monitoring" canChoosePlan={false} />);
    expect(screen.getByRole("heading", { name: "Only the owner can unlock monitoring" })).toBeTruthy();
    expect(screen.getByText("Your organization's workspace opens once the owner chooses a plan.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "See billing status" }).getAttribute("href")).toBe("/app/billing");
    expect(screen.queryByText(/Choose a plan/)).toBeNull();
    expect(screen.queryByRole("link", { name: "See plans" })).toBeNull();
  });
});
