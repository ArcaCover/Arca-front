import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// The debug boundary (DN-09 §6.1). Production code reaches the debug tools only through DebugMount and the bridge,
// whose bodies fold to nothing in a production build. Anything else from the debug folders, or the debug contract,
// would ship in the production bundle, and the build's leak check only knows a handful of strings.
const DEBUG_ONLY = "Debug-only code: outside components/debug and lib/debug, import only DebugMount and lib/debug/bridge (DN-09 §6.1).";
// From inside components/ or lib/, at any depth, a relative path reaches a debug folder without naming its parent:
// `./debug/...` from components/Navbar.tsx, `../debug/...` from lib/app/access.ts (DN-11 §6.4). No other folder is
// called debug, so such a path is refused everywhere.
const RELATIVE_DEBUG = "^(\\.\\.?/)+debug/(?!(DebugMount|bridge)$)";
const DEBUG_BOUNDARY = [
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
        ],
        message: DEBUG_ONLY,
      },
      { regex: RELATIVE_DEBUG, caseSensitive: true, message: DEBUG_ONLY },
    ],
  },
];
// no-restricted-imports does not see import(), so outside the debug folders this rule checks every import() itself:
// - a string literal source is refused when its value matches DEBUG_IMPORT_PATH, and a template literal without
//   expressions when its text does (esquery regexes cannot hold a "/", hence \x2F);
// - any other source is refused whatever it would name: a concatenation, a variable, a call, or a template with ${...}.
//   Its text is not the path it loads, so it cannot be checked, and production code only ever imports a literal path.
const DEBUG_IMPORT_PATH =
  "/^@arca\\x2Fcontracts\\x2Fdebug$|(^|\\x2F)(components|lib)\\x2Fdebug\\x2F(?!(DebugMount|bridge)$)|^(\\.\\.?\\x2F)+debug\\x2F(?!(DebugMount|bridge)$)/";
const BUILT_PATH = "Outside components/debug and lib/debug, import() takes a literal path, so the debug boundary can read it (DN-09 §6.1).";
const DEBUG_DYNAMIC_IMPORT = [
  "error",
  { selector: `ImportExpression[source.value=${DEBUG_IMPORT_PATH}]`, message: DEBUG_ONLY },
  {
    selector: `ImportExpression > TemplateLiteral.source[expressions.length=0] > TemplateElement[value.cooked=${DEBUG_IMPORT_PATH}]`,
    message: DEBUG_ONLY,
  },
  { selector: "ImportExpression[source.type!=/^(Literal|TemplateLiteral)$/]", message: BUILT_PATH },
  { selector: "ImportExpression > TemplateLiteral.source[expressions.length>0]", message: BUILT_PATH },
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
    rules: { "no-restricted-imports": DEBUG_BOUNDARY, "no-restricted-syntax": DEBUG_DYNAMIC_IMPORT },
  },
);
