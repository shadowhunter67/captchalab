# Adding a CAPTCHA to CaptchaLab

This guide takes you from nothing to a new CAPTCHA that can be tried, inspected and tested. There are two reference implementations: the **Slider** (drag, pointer motion, charts) and the **Checkbox** (press/keyboard activation, no trajectory, native control). When this guide says "see the Slider" or "see the Checkbox", read the named file; pick the one whose interaction is closest to yours. You do not need to read the whole repository first.

> **Reuse abstractions by behavior, not by file-name imitation.** A checkbox has no drag, so it needs no drag controller. Take the parts whose *job* you need.

```text
define domain types → generator → verifier → feature extractor → plugin → registry
   → web surface → Inspect view-data → tests → (later) Learn content
```

## 0. Scope rules (read first)

CaptchaLab plugins are **CaptchaLab-controlled challenges only**. Do not add third-party CAPTCHA solvers, automation of external services, bypass integrations or anti-bot evasion logic. Future synthetic behavior runs only against challenges CaptchaLab itself generates. See the checklists at the end.

## 1. Mental model and where code goes

```text
apps/web  ──►  packages/captcha-plugins  ──►  packages/captcha-core
(UI, DOM)      (your plugin + registry)        (event schema, recorder, gestures,
                                                motion features/series, plugin API)
```

- `captcha-core` and plugins contain **no React and no DOM**. Generators, verifiers, geometry and feature/series math are **pure and deterministic**. The only stateful piece is the event recorder, which takes an injectable clock (it defaults to `performance.now`).
- Anything a second CAPTCHA could reuse and that is not CAPTCHA-specific has a home already; don't duplicate it in your plugin or page:
  - pure analysis math → `captcha-core`;
  - presentation primitives → `apps/web/components/inspect` and `apps/web/lib/inspect`;
  - CAPTCHA-agnostic browser/lifecycle utilities → `apps/web/lib` (e.g. `pointer-adapter.ts`, `seed.ts` + `useSeededChallenge.ts` for `?seed=` and New challenge, `inspect/useEventSelection.ts` for event selection, `replay/` for the replay clock, driver, `useReplayDriver` and `useReplayPanel`, `format.ts`). Don't copy seed or selection handling into a new page.

## 2. The plugin (`packages/captcha-plugins/src/<id>/`)

Slider layout to copy as a starting point: `types.ts`, `generator.ts`, `verifier.ts`, `feature-extractor.ts`, `geometry.ts` (only if you need UI geometry), `plugin.ts`, `index.ts`, `__tests__/`.

### 2.1 Domain types (`types.ts`)

Define:

- **`Challenge`**: everything needed to render and verify, in **UI-size-independent units** (the Slider uses normalized positions in `[0, 1]`). Include an `id`. Contains no randomness source and no clock.
- **`Answer`**: only the *final state* of the solution (Slider: `{ position }`). Never copy the interaction history into it; that lives in the `InteractionSession`.
- **`Features`**: CAPTCHA-specific measurements. Extend the core types instead of re-declaring them: `BaseCaptchaFeatures` (`completionTime`, `eventCount`) and, for pointer-driven CAPTCHAs, `MotionFeatures`. Do **not** create one big interface of optional fields.
- **`FeatureContext`** (optional): rendered geometry the extractor needs to convert pointer pixels into challenge units (Slider: `{ layout }`). Use `undefined` (the default) if you need none.
- Semantic target ids as constants (Slider: `SLIDER_TARGETS`). Never DOM ids or CSS classes.

Write the **mathematical definition of every feature in a comment next to its type**: meaning, unit, edge cases (see `slider/types.ts`).

### 2.2 Generator (`generator.ts`)

`generate({ rng })` must be a pure function of the seeded `rng` (`createRng(seed)` from core). Never use `Math.random` or the clock. Keep values inside valid, comfortable bounds (the Slider avoids the track edges). Test: same seed ⇒ same challenge; many seeds ⇒ always valid.

### 2.3 Verifier (`verifier.ts`)

`verify(challenge, answer, interaction)` decides **correctness only**. Behavioral features and the interaction must not decide pass/fail in this demo. The answer (and, for safety, the challenge) crosses a trust boundary: validate shape and finiteness at runtime, including a missing or non-object value, and return `{ passed: false, reason }` instead of throwing. Test those inputs (the Slider's verifier tests cover `undefined`, `null`, primitives, non-finite and out-of-range values). Return a `reason` safe to show in Inspect, and optionally `measurements` (numbers with documented units).

### 2.4 Feature extractor (`feature-extractor.ts`)

`extractFeatures(challenge, interaction, context)` returns a **`FeatureSet`** (a CAPTCHA with no UI geometry, like the Checkbox, uses the default `undefined` context and callers pass `undefined`):

```ts
createFeatureSet(
  composeVersion(MY_FEATURES_SCHEMA, MOTION_FEATURES_SCHEMA),   // meaning/shape
  composeVersion(MY_EXTRACTOR, MOTION_EXTRACTOR),               // implementation
  { ...extractBaseFeatures(session), ...extractMotionFeatures(session), /* yours */ },
);
```

- `schemaVersion` changes when a definition's *meaning* changes; `extractorVersion` when the algorithm changes but the meaning does not (ADR 0004). Never change a definition silently.
- Reuse the core: `extractGestures` (per-contact press→release with end reason), `pointerTracks`, `extractMotionFeatures`. Select **one deterministic attempt** for attempt-based features and document the rule (Slider: the final completed handle drag).
- Return `null` for "not available" rather than `0`.
- Add a **golden test**: a fixed session must produce exact versions and hand-verified values, so a silent definition change fails CI.

### 2.5 Plugin and registry

```ts
// packages/captcha-plugins/src/<id>/plugin.ts   (see slider/plugin.ts)
export const myPlugin = defineCaptchaPlugin<"my-id", MyChallenge, MyAnswer, MyFeatures, MyFeatureContext>({
  id: "my-id",
  name: "My CAPTCHA",
  version: "1.0.0",
  generate: generateMyChallenge,
  verify: (challenge, answer) => verifyMyAnswer(challenge, answer),
  extractFeatures: (challenge, interaction, context) => extractMyFeatures(challenge, interaction, context),
});
```

`defineCaptchaPlugin` is the **only** way to create a registrable plugin: it checks that the generics agree across the three methods, freezes the object and brands it. Then add it to the registry object (`packages/captcha-plugins/src/registry.ts`); the key must equal the plugin `id`:

```ts
export const registry = createPluginRegistry({ slider: sliderPlugin, "my-id": myPlugin });
```

The registry is **typed at compile time**: `registry.get("my-id")` is exactly `typeof myPlugin`, so `generate`, `verify` and `extractFeatures` are type-checked with no casts. Unknown ids and mismatched answers are compile errors (see `__tests__/registry.test.ts`). Adding a plugin means editing that one object; runtime/third-party plugin loading is out of scope (ADR 0002). Export your plugin's public API from `src/index.ts`.

## 3. Interaction model rules

- **Never store raw DOM events.** Convert them into CaptchaLab's normalized events (`InteractionEvent`) via an adapter. In the web app that is `apps/web/lib/pointer-adapter.ts` (`toPointerSample`, `toRecorderEvent`), which also rejects non-finite values and unknown pointer types.
- Time `t` is relative and monotonic (ms since session start); the recorder stamps it. Do not use wall-clock time in analysis.
- Prefer **Pointer Events** for pointer UI, and emit **one family only**: never both touch and pointer events for the same contact.
- Record activation from **`pointerdown`/`pointerup`**, not from the native `click` event: `click` carries no honest pointer identity for keyboard activation, and core ignores `click` when building tracks and gestures. Keyboard activation (e.g. Space on a checkbox) is recorded as `keydown`/`keyup` with the physical `code`, directly, so you never fabricate pointer fields and never double-record `keydown` plus `click`. No schema change is needed for this (see how `slider-controller.ts` records keys).
- Keep **`pointerId`** and `pointerType`. Separate *recording input* from *state transition*: with a native control, the browser toggles it as the default action of the click that follows pointerup (or the keyup of Space), so your submit handler runs after the release is already recorded. Do not infer or flip state from events; read it from the native change event.
- Do not guess what the browser will do from geometry (e.g. "released outside, so cancel"): touch/pen have implicit capture and click anyway. Record what is delivered; let the extractor decide what counts as an activation. Handle **`pointercancel`**: it ends a contact but is not a completed attempt and must not submit an answer.
- Use **semantic target ids** (constants), not selectors.
- No arbitrary metadata on events. Keyboard events record only the physical `code`, never typed characters (`SCHEMA_VERSION` in `captcha-core/src/types/events.ts`).
- If a new kind of event is truly needed, change the schema in core, bump `SCHEMA_VERSION`, and update ADR 0003.

## 4. Web integration (`apps/web/features/<id>/`)

The Slider's roles, so you can decide which you need:

| Role | Slider file | Needed when |
|---|---|---|
| Interaction recorder/state machine (DOM-free, unit-tested) | `slider/slider-controller.ts`, `checkbox/checkbox-controller.ts` | always: it is where "record input" and "state transition" stay separate |
| DOM surface (events → controller, layout measurement) | `SliderSurface.tsx`, `CheckboxSurface.tsx` | always, but only as much as your UI needs. The Checkbox uses a **native** input as the source of truth and needs no pointer capture or geometry |
| Session (one challenge = one recorder + controller + result; remounted per challenge) | `SliderSession.tsx`, `CheckboxSession.tsx` | always |
| Page / challenge lifecycle | `SliderPlayground.tsx`, `CheckboxPlayground.tsx` + `app/playground/<id>/page.tsx` | always (add a route); use `useSeededChallenge` for `?seed=` / New challenge |
| Inspect view-data (which data to show) | `slider-view-data.ts`, `checkbox-view-data.ts` | always |
| Inspect composition | `SliderInspect.tsx`, `CheckboxInspect.tsx` | always |
| Replay specifics (derived state model + the SVG that paints it) | `slider/replay-state.ts` + `SliderReplay.tsx`, `checkbox-replay-state.ts` + `CheckboxReplay.tsx` | when you replay; reuse `useReplayPanel` for the clock/scrubber glue |
| Learn content | `CheckboxLearn.tsx` | when the CAPTCHA page is added (the Slider's is still a short details block) |

Rules that keep the slice correct:

- **One challenge = one session.** Key the session component by the challenge so a new challenge drops the recorder, result and replay. Nothing may leak across challenges.
- **Do not `setState` per raw pointer event.** Raw events go to the recorder; React state carries only what must render (phase, final result). Move things imperatively with refs/transform while interacting.
- Call the plugin from the web layer (`registry.get("my-id").verify(...)`, `.extractFeatures(...)`). **Never re-implement verification, feature math or unit conversions in `apps/web`.** If the UI needs a conversion the extractor also uses (the Slider's pointer→position mapping), export it from the plugin and use it on both sides.
- Geometry comes from measurement, which can be invalid (zero width, NaN, resize mid-interaction). Validate it and disable or abort safely; never feed invalid geometry to the extractor.
- UI actions that are not input (e.g. "Try again" resetting the handle) are **session markers**, never fake events. The marker facility is currently **Slider-only** (`SessionMarker` in `apps/web/lib/replay/markers.ts` is a single `attempt-reset` with a slider position). If your CAPTCHA needs markers, generalize that union deliberately and update every consumer (`createHandleReplay`-style replay models, `SliderReplay`, the timeline annotations in `SliderInspect`); do not reuse the Slider's fields or invent events.

## 5. Reusing the Inspect primitives

Generic building blocks live in `apps/web/components/inspect` and `apps/web/lib/inspect`. They know nothing about any CAPTCHA and **must not import CAPTCHA-specific types**:

| Primitive | Use it for |
|---|---|
| `VerificationSummary` | pass/fail + reason (+ the correctness-vs-behavior note) |
| `MetricTable` over `InspectMetric[]` | any feature list; `null` shows "—"; units and formatting handled; per-metric `format` override |
| `TrajectoryView` over `buildTrajectoryGeometry(tracks, bounds)` | pointer paths with start/end markers; your CAPTCHA supplies tracks, `underlay`/`overlay` |
| `MotionChart` (+ its data table) over `MotionSeries` segments | velocity/acceleration; only for pointer-motion CAPTCHAs |
| `EventExplorer` (= `EventTimeline` + `EventInspector`) with `useEventSelection(session)` | any session; selection is one event index bound to the session snapshot |
| `ReplayControls` + `useReplayPanel` (over `ReplayDriver`) | play/pause/speed/scrub for a derived replay model; you supply only `drawFrame` |

A CAPTCHA without a meaningful path (the Checkbox) **should not** render the trajectory or motion charts. Inspect is composed from what makes sense, not from everything that exists.

**Pattern:** write a small *view-data* module in your feature (see `slider-view-data.ts`) that turns your plugin's output into the primitives' inputs: which tracks, which metrics and labels, which series. Primitives consume descriptors; the adapter owns the CAPTCHA vocabulary. A CAPTCHA that does not use pointer motion simply doesn't render the motion charts or trajectory.

Motion series (`sessionMotionSeries`, `buildMotionSeries`, `gestureTrack`) come from `captcha-core`; do not recompute velocity or acceleration in the web app.

## 6. Tests: definition of done

- [ ] **Generator** deterministic for a seed; always valid; extreme `rng` values.
- [ ] **Verifier** boundaries (exact, within, on the tolerance boundary, outside); malformed/non-finite answers and challenges do not throw and do not pass.
- [ ] **Feature math** with deterministic fixtures: normal case, no/one sample, duplicate timestamps, reversed or no movement, multiple attempts, cancelled/unfinished attempt, unrelated pointers/targets, invalid layout; plus a **golden** test pinning versions and values.
- [ ] **Interaction edge cases**: touch and pen, keyboard-only, `pointercancel`, multiple pointer ids.
- [ ] **Registry types**: `registry.get("my-id")` keeps your types; mismatches fail via `@ts-expect-error` tests.
- [ ] **Web controller/surface** behavior (unit tests on the DOM-free controller): start, move, release submits, cancel does not, resize aborts safely, new challenge resets.
- [ ] **E2E solve flow**: open the page with `?seed=…`, solve, see the result and Inspect metrics, replay, "New challenge" resets everything.
- [ ] **Privacy E2E for your route**: call `watchPrivacy(page)` from `apps/web/e2e/privacy.ts` right after `goto`, perform the full flow (solve, replay, select an event, open data tables), then `await assertNoDataLeft()`. It fails on any network request, console output, `localStorage`/`sessionStorage` write (even if cleared later), IndexedDB open, or cookie write. The Slider's E2E is the example; a new route without its own privacy scenario is not done.
- [ ] **Accessibility assertions** (see section 7): accessible name/role/state of the control, focusability, and a keyboard path (or an explicit statement and test that none exists).

Motion charts are not required for a CAPTCHA that does not use pointer motion.

## 7. Accessibility checklist

Assess and write down in the UI (do not claim more than is true):

- **Native-equivalent semantics** for the control: an accessible name, the right role and state (e.g. a checkbox exposes checked/unchecked and activates with Space), visible focus. Assert these in a test.
- **Pointer** (mouse, touch, pen) works; `touch-action` is set deliberately and only on the element that needs it.
- **Keyboard**: a way to complete it, or an explicit statement that there is none and why.
- **Screen reader**: what is exposed (labels, roles, live result) and what is not.
- **Color independence**: state is never conveyed by color alone.
- **Reduced motion**: respect `prefers-reduced-motion` for animation and replay.
- **CAPTCHA-specific limitations**: many challenges are inherently hard to make accessible. Say so; do not call a CAPTCHA accessible because the page around it passes an audit.

## 8. Privacy checklist

- Raw interaction data stays in the browser by default and in memory for the page's life.
- No analytics, no network requests, no `localStorage`/`sessionStorage`/IndexedDB for interaction data.
- No `console.log` of events or coordinates (lint forbids it); `console.error/warn` messages must not contain raw interaction values.
- Collect only what the feature needs; no fingerprinting; no extra device/browser information.
- Anything that would upload data requires an explicit, separately designed opt-in consent feature.

## 9. Safety and scope checklist

- [ ] The challenge is generated and verified by CaptchaLab code.
- [ ] No third-party CAPTCHA, API, solver or service is called or automated.
- [ ] No bypass, anti-bot-evasion or "human-likeness scoring" logic. Features are descriptive; never state that a pattern means "bot" or "human".
- [ ] Educational text (when added) includes: *CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.*

## 10. Learn content (later)

Each CAPTCHA should eventually explain: what it is, how the challenge is generated, what the user must do, how verification works, which interaction signals are observable, strengths, weaknesses, accessibility considerations and automation considerations, and the limits of the simulation. The Slider page has a short "How it works and its limits" section as a placeholder; full Learn pages come later.

## 11. Finish

- Add the route (`apps/web/app/playground/<id>/page.tsx`) and make it discoverable: link it from `apps/web/app/page.tsx`. Add an E2E spec for it (solve, keyboard, Inspect, replay, New challenge, privacy via `watchPrivacy`); the replay scrubber helpers are in `apps/web/e2e/replay.ts`.
- Update the README **Current status** table (move the CAPTCHA from "not implemented" to "implemented") and the Roadmap, so the docs stay truthful.
- Run the commands in [CONTRIBUTING.md](../CONTRIBUTING.md#before-you-open-a-pull-request), update docs/ADRs if you changed a definition or architecture, and open a pull request using its checklist.
