# 0003 — Interaction event model

## Context
CAPTCHA modules, the Inspect workbench, replay and (later) synthetic comparison all consume interaction data. Storing raw DOM events would couple everything to the browser and leak more than needed.

## Decision
- `InteractionEvent` is a discriminated union: `PointerInteractionEvent` (mouse/touch/pen, `x`/`y` **required**) and `KeyInteractionEvent` (`code` only).
- `t` is milliseconds since session start from `performance.now()`; wall-clock `startedAt` is informational and never used in analysis.
- Coordinates are CSS px relative to the challenge surface.
- Keyboard events store the physical `code`, never the typed character.
- `InteractionSession` carries `schemaVersion` (currently `2`); `durationMs` is monotonic.
- The recorder lives in `captcha-core`, has an injectable clock, optional move throttling and a hard event cap. It has no DOM/React dependency; a thin browser adapter (later, in the web app) converts DOM events to recorder calls.

- **Pointer identity (v2):** pointer events carry required `pointerId`. Without it a `pointerup` of one finger/pen ends another's gesture, and a Slider retry can be joined to the previous attempt. A *contact* is keyed by `family:pointerType:pointerId` (`contactKey`); Pointer Events ids and legacy touch identifiers are separate id spaces. Adapters must emit one event family per physical contact (prefer Pointer Events); duplicate families are not de-duplicated.
- **`pointercancel`** is part of the schema: it ends a contact like `pointerup` but is not a "completed" attempt. No `touchcancel` kind: adapters map it to `pointercancel`; `touch*` kinds are legacy.
- **Gestures** (`extractGestures`): `pointerdown -> moves -> up/cancel` per contact, with end reason `up | cancel | interrupted | open`. A second press on a live contact closes the previous one as `interrupted`. Hover before a press is not part of a gesture, but *is* part of motion tracks (approach movement is signal and mouse hover is continuous).
- **Removed** the free-form `meta` field (privacy and unvalidated shape).
- **`recorder.snapshot()`** returns a copy of the session so far without ending recording (the web layer verifies/inspects on every submit, and "Try again" continues the same session); `finish()` freezes it.
- Precondition for analysis: event times are non-decreasing. The recorder guarantees it; sessions imported from elsewhere need a validator (open item).

## Alternatives considered
- Optional `x`/`y` on every event (as in the original sketch): rejected; every consumer would need undefined checks, and key events never have coordinates. A union makes the math total.
- Storing full `PointerEvent` objects: rejected for coupling and privacy.

## Consequences
- Feature and replay code is pure and testable with fixtures.
- Version 1 -> 2 added `pointerId` and `pointercancel` and removed `meta`; no persisted data existed.
- Any change to event shape or meaning requires a `SCHEMA_VERSION` bump.
