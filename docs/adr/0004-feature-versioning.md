# 0004 — Feature definitions and versioning

## Context
Behavioral features (velocity, direction changes, ...) are only comparable across sessions if their definitions never silently change.

## Decision
- Every feature has a documented definition, unit and edge-case behavior next to its type (`features/motion.ts`).
- `FEATURE_DEFINITIONS_VERSION` is bumped whenever any definition changes meaning.
- `BaseCaptchaFeatures` stays minimal (`completionTime`, `eventCount`). Shared pointer measurements live in a separate `MotionFeatures`, which plugins compose into their own feature interface (e.g. `SliderFeatures extends BaseCaptchaFeatures, MotionFeatures`). No giant optional-field interface.
- Edge cases return `0`/`null`, never `NaN`. Segments with `dt <= 0` are skipped. Variance is population variance.
- Features are descriptive measurements, not human/bot indicators.

## Alternatives considered
- One feature interface with many optional fields: rejected (unclear which are present, grows without bound).

## Consequences
- Stored or exported features must record the definitions version they were computed with.
