# Contributing to CaptchaLab

Thanks for helping. CaptchaLab is an educational lab; please read the scope rules below first.

## Scope and safety (non-negotiable)

- Only CaptchaLab-controlled challenges. No third-party CAPTCHA solvers, no automation of external services, no bypass or anti-bot-evasion logic. Synthetic behavior, when added, runs only against CaptchaLab's own challenges.
- Do not describe any behavioral pattern as proof of "human" or "bot". Features are descriptive measurements.
- Raw interaction data stays in the browser by default. No analytics, no storage or upload of interaction data, no logging of raw events or coordinates. Any future data contribution must be explicit opt-in.
- The demo verifier is not production security. Do not market it as such.

## Setup

Node.js ≥ 22 (see `.nvmrc`) with Corepack. No global pnpm.

```bash
corepack pnpm install
corepack pnpm --filter web dev      # http://localhost:3000/playground/slider
```

## Before you open a pull request

Run what CI runs:

```bash
corepack pnpm -r run lint
corepack pnpm -r run typecheck
corepack pnpm -r run test
corepack pnpm --filter web build
corepack pnpm --filter web test:e2e
```

## Code expectations

- Strict TypeScript; no `any` (lint enforces it). Explicit types at package boundaries.
- Keep dependency direction: `apps/web → captcha-plugins → captcha-core`. No React/DOM in `captcha-core` or in plugins.
- Pure functions for analysis logic; deterministic tests. New math gets a written definition (units, edge cases) and fixtures. If a feature definition changes meaning, bump its schema version (see ADR 0004); golden tests exist to stop silent changes.
- Don't copy core logic into the web app (e.g. velocity math); call the package that owns it.
- Don't disable lint rules in bulk. A local disable needs a one-line reason.
- Significant decisions get a short ADR in `docs/adr/`.

## Adding a CAPTCHA

Follow [docs/adding-a-captcha.md](docs/adding-a-captcha.md): it covers the plugin, web integration, Inspect reuse and the test, accessibility, privacy and scope checklists.

## Pull request checklist

- [ ] Lint, typecheck, unit tests, build and E2E pass locally.
- [ ] New logic has unit tests, including edge cases (empty, one sample, duplicate timestamps, invalid input).
- [ ] No raw interaction data leaves the browser or reaches the console/storage/IndexedDB/cookies. Every route has a `watchPrivacy` E2E scenario (`apps/web/e2e/privacy.ts`) and they pass.
- [ ] Accessibility limitations of any new challenge are stated in the UI.
- [ ] Docs/ADR updated when behavior, definitions or architecture changed.
- [ ] Within scope: CaptchaLab-controlled challenges only.

## Reporting problems

Bugs and ideas: open an issue. Security-relevant reports: see [SECURITY.md](SECURITY.md) and do not post exploit details publicly.

## License of contributions

The repository does not have a license yet (see README). Please wait for the owner to choose one before relying on any assumption about how contributions are licensed.
