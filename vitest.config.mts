import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    setupFiles: ["./vitest.setup.ts"],
    // A test that walks the /app layout through several waits, each within its own limit, can outlast the default five
    // seconds when the full run keeps every core busy. Arca-back allows the same twenty.
    testTimeout: 20_000,
  },
});
