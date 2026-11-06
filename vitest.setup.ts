// Runs before every test file. Testing Library's findBy* and waitFor give up after one second by default. A full run puts
// a jsdom file on every core at once, and a file's first, cold render of the real /app layout can then take longer than
// that, so waits that pass alone timed out in the full run. The waits are for data the mocks already hold, so a longer
// limit hides no slowness. Only the files with a DOM load Testing Library for it.
if (typeof document !== "undefined") {
  const { configure } = await import("@testing-library/react");
  configure({ asyncUtilTimeout: 5_000 });
}

export {};
