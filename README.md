# CaptchaLab

**Explore. Interact. Understand.**

CaptchaLab is an educational, research-oriented web app for exploring how people interact with CAPTCHA challenges: the events a challenge produces, the behavioral features that can be measured from them, and a replay of your own attempt. Everything runs in your browser.

> **Status: Alpha (`0.1.0-alpha`, not published).** One CAPTCHA is implemented. APIs may still change. See [Current status](#current-status).

## What is CaptchaLab?

A controlled lab for **Human–Computer Interaction and behavioral-analysis education**. You try a challenge, then *inspect* the normalized interaction events, extracted features, trajectory, velocity and acceleration, and replay the attempt.

It illustrates signals that a CAPTCHA system may use. It does **not** claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems, and no measurement shown here is a rule for telling people from software.

## Project scope and safety

CaptchaLab is an educational / research / HCI lab. It is **not** intended for, and will not accept contributions for:

- bypassing CAPTCHAs on third-party websites,
- solving commercial CAPTCHA services automatically,
- interacting with challenges that belong to external services,
- evading anti-bot systems.

Any synthetic interaction added in the future may only target challenges created and controlled by CaptchaLab itself. The demo verifier runs in the browser and is **not** production anti-abuse protection (see [SECURITY.md](SECURITY.md)).

## Current status

| | |
|---|---|
| **Implemented CAPTCHA** | **Slider** (reference implementation) |
| Not implemented yet | Text, Image Grid, Drag & Drop, Image Rotation, Checkbox, Human-vs-Synthetic comparison, research data contribution |

Only the Slider exists today. The rest is [roadmap](#roadmap), not functionality.

### What you can do with the Slider

- **Try** it with a mouse, touch or pen (Pointer Events), or with the keyboard (arrow keys, Home/End, Enter).
- **Inspect** the result:
  - pass/fail (challenge correctness only; behavioral metrics never affect it),
  - slider metrics (drag duration, release error, overshoot, attempts) and whole-session motion metrics,
  - trajectory with start/end markers and target region,
  - velocity and acceleration charts, each with an accessible data table,
  - an event timeline and an event inspector (selection syncs with the charts and trajectory).
- **Replay** your interaction: play / pause / restart, 0.5×/1×/2×, scrubbing. Replay only draws recorded data; it never drives the real slider.
- `?seed=12345` makes the challenge deterministic (used by tests; also handy for reproducing a challenge).

## Architecture

```text
apps/web                     Next.js app (UI, DOM adapters, Inspect composition)
packages/captcha-plugins     CAPTCHA plugins + the typed registry (Slider today)
packages/captcha-core        Framework-independent logic: event schema, recorder, gestures,
                             motion features/series, replay timeline, plugin API
packages/config              Shared TypeScript + ESLint configuration
docs/                        ADRs and guides
```

Dependency direction is strictly `apps/web → captcha-plugins → captcha-core`. `captcha-core` has no React or DOM dependency.

- Raw browser events are never stored; they are normalized into CaptchaLab's own event format (`captcha-core`), with relative monotonic timestamps.
- A CAPTCHA is a **plugin**: `generate`, `verify` (correctness only), `extractFeatures` (behavior). A compile-time typed registry keeps each plugin's challenge/answer/feature types intact.
- Feature output is versioned (`FeatureSet` with `schemaVersion` and `extractorVersion`).

Design decisions are recorded in [docs/adr](docs/adr).

## Getting started

Requirements: Node.js ≥ 22 (CI uses the version in [.nvmrc](.nvmrc)) with Corepack, which provides the pinned pnpm version. No global pnpm is needed.

```bash
corepack pnpm install
corepack pnpm --filter web dev      # http://localhost:3000/playground/slider
```

## Scripts

| Command | What it does |
|---|---|
| `corepack pnpm -r run lint` | ESLint on every workspace (type-aware, warnings are errors) |
| `corepack pnpm -r run typecheck` | `tsc` on every workspace |
| `corepack pnpm -r run test` | Unit tests (Vitest) |
| `corepack pnpm --filter web build` | Production build of the web app |
| `corepack pnpm --filter web test:e2e` | Playwright E2E. Locally it uses your installed Chrome and the dev server. In CI (`CI=true`) it uses Playwright's Chromium (`corepack pnpm --filter web exec playwright install chromium`) against the production build, so run `build` first |

The same commands run in [CI](.github/workflows/ci.yml).

## Privacy

Raw interaction data is processed locally in the browser and is not uploaded by the current implementation. The app makes no analytics calls and stores nothing in `localStorage`/`sessionStorage`. This is checked by an automated E2E test (no network requests, console output, `localStorage`/`sessionStorage` writes, IndexedDB opens or cookie writes while interacting, replaying and inspecting) and a lint rule that forbids `console.log`. Keyboard events record only the physical key code (e.g. `ArrowLeft`), never typed characters.

A future research-contribution feature, if added, will be opt-in with explicit consent.

## Roadmap

Planned, **not implemented**: Checkbox, Text, Image Grid, Drag & Drop and Image Rotation CAPTCHAs; Human-vs-Synthetic comparison (CaptchaLab-controlled challenges only); explicit opt-in anonymous data contribution; Learn pages; more accessibility and performance work.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). To add a CAPTCHA, follow [docs/adding-a-captcha.md](docs/adding-a-captcha.md). Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md).

## License

**No license has been chosen yet.** Until the repository owner adds a `LICENSE` file, no open-source license is granted: all rights are reserved by default, so do not assume you may reuse or redistribute the code.
