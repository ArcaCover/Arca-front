// @vitest-environment jsdom
import { DEBUG_PRESETS, DebugScenario } from "@arca/contracts/debug";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SCENARIO_STORAGE_KEY } from "@/lib/debug/bridge";
import ScenarioControls from "./ScenarioControls";

const stored = (): unknown => {
  const raw = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
};
const select = (name: string) => screen.getByRole<HTMLSelectElement>("combobox", { name });
const optionText = (name: string, value: string) =>
  [...select(name).options].find(option => option.value === value)?.textContent;
const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock"));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ScenarioControls", () => {
  it("stores the scenario the axes describe, and only while it injects something", async () => {
    render(<ScenarioControls apiUrl="http://api" />);
    expect(stored()).toBeNull();

    await userEvent.selectOptions(select("Avvo"), "error");
    expect(stored()).toEqual(DebugScenario.parse({ avvo: "error" }));

    await userEvent.selectOptions(select("Polls"), "hang");
    expect(stored()).toEqual(DebugScenario.parse({ avvo: "error", http: { poll: "hang" } }));

    await userEvent.selectOptions(select("Avvo"), "default");
    await userEvent.selectOptions(select("Polls"), "none");
    expect(stored()).toBeNull();
  });

  it("fills the axes from a preset, and Clear forgets the scenario", async () => {
    render(<ScenarioControls apiUrl="http://api" />);

    await userEvent.click(button("Apify out of credit"));
    expect(select("Bar").value).toBe("apify_quota");
    expect(select("Avvo").value).toBe("apify_quota");
    expect(stored()).toEqual(DebugScenario.parse(DEBUG_PRESETS.apify_quota.scenario));

    // A preset is the whole scenario it names: the axes it does not mention go back to their defaults.
    await userEvent.click(button("Session expired"));
    expect(select("Polls").value).toBe("unauthorized");
    expect(select("Avvo").value).toBe("default");

    await userEvent.click(button("Clear"));
    expect(stored()).toBeNull();
    expect(select("Polls").value).toBe("none");
  });

  it("starts from the scenario this tab already stored, and drops one it cannot read", () => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ website: "blocked" }));
    const { unmount } = render(<ScenarioControls apiUrl="http://api" />);
    expect(select("Website").value).toBe("blocked");
    unmount();

    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ website: "on_fire" }));
    render(<ScenarioControls apiUrl="http://api" />);
    expect(select("Website").value).toBe("default");
    expect(stored()).toBeNull();
  });

  it("in mock, offers latency and says that injected faults do not wait for it", () => {
    render(<ScenarioControls apiUrl="http://api" />);

    expect(select("Latency").value).toBe("instant");
    expect(optionText("Website", "default")).toBe("default");
    expect(document.body.textContent).toContain("Latency only delays the default website fixture. Injected faults answer at once.");
  });

  it("in live-debug, hides latency and the mock form filler, and calls each default branch real", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    render(<ScenarioControls apiUrl="http://api" />);

    expect(screen.queryByRole("combobox", { name: "Latency" })).toBeNull();
    expect(document.body.textContent).not.toContain("Latency");
    expect(screen.queryByRole("button", { name: "Fill mock firm" })).toBeNull();
    expect(optionText("Website", "default")).toBe("real");
    expect(optionText("Bar", "default")).toBe("real");
    expect(optionText("Planner", "default")).toBe("real");
    expect(optionText("Polls", "none")).toBe("none");
  });

  it("fills the quote form the way typing does, so React state sees the values", async () => {
    function QuoteForm() {
      const [email, setEmail] = useState("");
      const [domain, setDomain] = useState("");
      return (
        <>
          <input aria-label="Work email" value={email} onChange={event => setEmail(event.target.value)} />
          <input aria-label="Firm website" value={domain} onChange={event => setDomain(event.target.value)} />
          <p data-testid="form-state">{`${email} ${domain}`}</p>
        </>
      );
    }
    render(
      <>
        <QuoteForm />
        <ScenarioControls apiUrl="http://api" />
      </>,
    );

    await userEvent.click(button("Fill mock firm"));

    expect(screen.getByTestId("form-state").textContent).toMatch(/^debug\+\d+@arca\.example robust\.arca\.example$/);
  });

  it("resets the back's limits, and says when the back did not", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    render(<ScenarioControls apiUrl="http://api" />);

    await userEvent.click(button("Reset limits"));
    expect(await screen.findByText("Rate limits and in-memory data cleared")).toBeTruthy();
    // The custom header makes the browser preflight the reset, so only an allowed origin can send it.
    expect(fetcher).toHaveBeenCalledWith(
      "http://api/__debug/reset",
      expect.objectContaining({ method: "POST", headers: { "X-Arca-Debug": "1" } }),
    );

    await userEvent.click(button("Reset limits"));
    expect(await screen.findByText("The API answered 404")).toBeTruthy();
  });

  // DN-09 §5.2: only mock wipes the back's memory, so live-debug does not say it did.
  it("in live-debug, says the reset cleared the rate limits only", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })));
    render(<ScenarioControls apiUrl="http://api" />);

    await userEvent.click(button("Reset limits"));

    expect(await screen.findByText("Rate limits cleared")).toBeTruthy();
    expect(document.body.textContent).not.toContain("in-memory");
  });

  // DN-09 §5.3: latency exists only in mock. A value left over from a mock session in this tab is dropped, not kept
  // behind a control live-debug does not show.
  it("in live-debug, drops a stored latency from the scenario, what it stores and what it lists", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ latency: "slow" }));
    const { unmount } = render(<ScenarioControls apiUrl="http://api" />);
    expect(stored()).toBeNull();
    expect(document.body.textContent).toContain("Next scan: no scenario injected");
    unmount();

    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ latency: "slow", avvo: "error" }));
    render(<ScenarioControls apiUrl="http://api" />);
    expect(stored()).toEqual(DebugScenario.parse({ avvo: "error" }));
    expect(document.body.textContent).toContain("Next scan injects: Avvo error");

    await userEvent.selectOptions(select("Bar"), "error");
    expect(stored()).toEqual(DebugScenario.parse({ avvo: "error", bar: "error" }));
    expect(document.body.textContent).not.toContain("Latency");
  });

  it("in mock, keeps a stored latency", () => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ latency: "slow" }));
    render(<ScenarioControls apiUrl="http://api" />);

    expect(select("Latency").value).toBe("slow");
    expect(stored()).toEqual({ latency: "slow" });
    expect(document.body.textContent).toContain("Next scan injects: Latency slow");
  });

  it("tells the strip whenever the armed scenario changes", async () => {
    const onScenarioChange = vi.fn();
    render(<ScenarioControls apiUrl="http://api" onScenarioChange={onScenarioChange} />);

    await userEvent.click(button("Apify out of credit"));
    expect(onScenarioChange).toHaveBeenCalledTimes(1);
    await userEvent.selectOptions(select("Website"), "error");
    expect(onScenarioChange).toHaveBeenCalledTimes(2);
    await userEvent.click(button("Clear"));
    expect(onScenarioChange).toHaveBeenCalledTimes(3);
  });
});
