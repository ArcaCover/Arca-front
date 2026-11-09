// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { saveFile } from "@/lib/api/download";

describe("saveFile", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hands the file to the browser under the API's filename, then releases it", () => {
    vi.useFakeTimers();
    // jsdom has neither of these.
    const createObjectURL = vi.fn(() => "blob:arca-report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const clicked: Array<{ href: string; download: string; attached: boolean }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
    });
    const blob = new Blob(["%PDF"], { type: "application/pdf" });

    saveFile({ blob, filename: "arca-quick-scan-smithlaw.com-2026-09-11.pdf" });

    expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(blob);
    expect(clicked).toEqual([
      { href: "blob:arca-report", download: "arca-quick-scan-smithlaw.com-2026-09-11.pdf", attached: true },
    ]);
    // Nothing is left behind in the page, and the URL outlives the click long enough to be read.
    expect(document.querySelector("a")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:arca-report");
  });
});
