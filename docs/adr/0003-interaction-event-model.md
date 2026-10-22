# 0003 — Interaction event model

## Context
CAPTCHA modules, the Inspect workbench, replay and (later) synthetic comparison all consume interaction data. Storing raw DOM events would couple everything to the browser and leak more than needed.

## Decision
- `InteractionEvent` is a discriminated union: `PointerInteractionEvent` (mouse/touch/pen, `x`/`y` **required**) and `KeyInteractionEvent` (`code` only).
- `t` is milliseconds since session start from `performance.now()`; wall-clock `startedAt` is informational and never used in analysis.
- Coordinates are CSS px relative to the challenge surface.
- Keyboard events store the physical `code`, never the typed character.
- `InteractionSession` carries `schemaVersion` (currently `1`); `durationMs` is monotonic.
- The recorder lives in `captcha-core`, has an injectable clock, optional move throttling and a hard event cap. It has no DOM/React dependency; a thin browser adapter (later, in the web app) converts DOM events to recorder calls.

## Alternatives considered
- Optional `x`/`y` on every event (as in the original sketch): rejected; every consumer would need undefined checks, and key events never have coordinates. A union makes the math total.
- Storing full `PointerEvent` objects: rejected for coupling and privacy.

## Consequences
- Feature and replay code is pure and testable with fixtures.
- Any change to event shape or meaning requires a `SCHEMA_VERSION` bump.
