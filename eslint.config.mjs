import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// The debug boundary (DN-09 §6.1). Production code reaches the debug tools only through DebugMount and the bridge,
// whose bodies fold to nothing in a production build. Anything else from the debug folders, or the debug contract,
// would ship in the production bundle, and the build's leak check only knows a handful of strings.
const DEBUG_ONLY = "Debug-only code: outside components/debug and lib/debug, import only DebugMount and lib/debug/bridge (DN-09 §6.1).";
const debugBoundary = (...relative) => [
  "error",
  {
    paths: [
      { name: "@arca/contracts/debug", message: "The debug contract is for components/debug and lib/debug only (DN-09 §6.1)." },
    ],
    patterns: [
      {
        group: [
          "@/components/debug/*", "!@/components/debug/DebugMount",
          "@/lib/debug/*", "!@/lib/debug/bridge",
          "**/components/debug/*", "!**/components/debug/DebugMount",
          "**/lib/debug/*", "!**/lib/debug/bridge",
          ...relative,
        ],
        message: DEBUG_ONLY,
      },
    ],
  },
];
// no-restricted-imports does not see import(). esquery regexes cannot hold a "/", hence \x2F.
const DEBUG_DYNAMIC_IMPORT = [
  "error",
  {
    selector:
      "ImportExpression[source.value=/^@arca\\x2Fcontracts\\x2Fdebug$|(^|\\x2F)(components|lib)\\x2Fdebug\\x2F(?!(DebugMount|bridge)$)/]",
    message: DEBUG_ONLY,
  },
];

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
  {
    ignores: ["components/debug/**", "lib/debug/**"],
    rules: { "no-restricted-imports": debugBoundary(), "no-restricted-syntax": DEBUG_DYNAMIC_IMPORT },
  },
  // Files directly in components/ or lib/ can reach the debug folders as `./debug/...`.
  {
    files: ["components/*", "lib/*"],
    rules: { "no-restricted-imports": debugBoundary("./debug/*", "!./debug/DebugMount", "!./debug/bridge") },
  },
);
