import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Next 16 dropped `next lint`, so ESLint is wired up directly. Deliberately narrow: the
// recommended sets plus the rules of hooks, which is the one class of mistake in this
// codebase that TypeScript cannot catch on its own.
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // v7 ships both shapes. The top-level `configs` are still eslintrc-style (plugins as an
  // array of strings); the flat ones live one level down, under `configs.flat`.
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Unused arguments are how the codebase discards values it must still name.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // New in react-hooks v7, and it fires on four places that predate this config:
      // AiGapSection, OceanPanel, useInView and the fill-on-mount flip in ScoreGauge. They
      // work and they were approved, so they are not rewritten here as a side effect of
      // adding a linter. Kept as a warning so the finding stays visible and `lint` can
      // still gate real errors. Promote to "error" once those four are addressed.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
);
