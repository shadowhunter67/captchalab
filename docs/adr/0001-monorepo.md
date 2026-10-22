# 0001 — Monorepo with pnpm workspaces and Turborepo

## Context
CaptchaLab has framework-independent logic (core, plugins, visualization, synthetic) and a Next.js app. Package boundaries must stay explicit so contributors can add a CAPTCHA without touching the app.

## Decision
pnpm workspaces (`apps/*`, `packages/*`, `examples/*`) with Turborepo task orchestration. Packages are consumed as TypeScript source (`exports: ./src/index.ts`) until a publish step is needed. Shared strict `tsconfig.base.json` in `packages/config`.

## Alternatives considered
- Single Next.js app with folders: faster start, but weak boundaries and `captcha-core` could acquire React/Next imports.

## Consequences
- Turbo needs `pnpm` on PATH. On machines without a global pnpm, use `corepack pnpm -r run typecheck|test` (equivalent) until `corepack enable` or a global pnpm is installed.
- `pnpm-workspace.yaml` allows the esbuild postinstall (`allowBuilds`) required by Vitest.
