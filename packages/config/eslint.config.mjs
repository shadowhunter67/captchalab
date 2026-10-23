// Shared ESLint configuration for every workspace package (the root eslint.config.mjs re-exports it).
// Scope: correctness only. No stylistic rules, no formatter.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "**/.turbo/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      // Type-aware linting: resolves the nearest tsconfig.json for each file.
      parserOptions: { projectService: true },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // False positives for plugin objects (methods are always called through the object or passed as
      // callbacks that do not use `this`).
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Promise misuse (needs type information).
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      // Privacy guard: interaction data must never be logged. Only error/warn diagnostics are allowed.
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
  {
    // Plain JS config files are not part of any tsconfig project.
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      // Classic Hooks rules only. react-hooks v7's newer "React Compiler" rules (set-state-in-effect,
      // refs, immutability) flag deliberate patterns here and are tracked as backlog, not silenced.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // The app uses the App Router only; this rule inspects a Pages Router directory.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
);
