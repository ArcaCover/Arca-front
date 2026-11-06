// @vitest-environment jsdom
import { useEffect, useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

// The limits vitest.config.mts and vitest.setup.ts give every file, so none has to set them for itself: a full run on a
// busy machine makes a file's first render and the tests that walk /app through several waits slower than the defaults.

afterEach(cleanup);

function ShownLate({ after }: { after: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), after);
    return () => clearTimeout(timer);
  }, [after]);
  return shown ? <p>Loaded</p> : null;
}

it("waits for longer than Testing Library's default second", async () => {
  render(<ShownLate after={1_500} />);
  expect(await screen.findByText("Loaded")).toBeTruthy();
});

it("gives each test more than vitest's default five seconds", ({ task }) => {
  expect(task.timeout).toBe(20_000);
});
