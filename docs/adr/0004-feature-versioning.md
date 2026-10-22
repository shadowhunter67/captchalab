# 0004 — Feature definitions and versioning

## Context
Behavioral features (velocity, direction changes, ...) are only comparable across sessions if their definitions never silently change.

## Decision
- Every feature has a documented definition, unit and edge-case behavior next to its type (`features/motion.ts`).
- Feature output is a `FeatureSet<T> = { schemaVersion, extractorVersion, features }` envelope. Versions live on the envelope, never on individual numbers.
  - `schemaVersion`: shape and *meaning* of the features (what is measured, unit, edge-case rules). Any definition change MUST change it. Data is comparable only when equal.
  - `extractorVersion`: the implementation. Changes for fixes/refinements that keep the meaning, so stored data can be traced to the code that produced it.
  - Both are composite strings because plugin features embed core features, e.g. `slider@1;motion@1`: a change in either layer is visible.
- Silent change is prevented by **golden tests**: a fixed session must produce exact versions and values (hand-verified), so any edit to a definition fails CI until the version and fixture are updated deliberately.
- `BaseCaptchaFeatures` stays minimal (`completionTime`, `eventCount`). Shared pointer measurements live in a separate `MotionFeatures`, which plugins compose into their own feature interface (e.g. `SliderFeatures extends BaseCaptchaFeatures, MotionFeatures`). Motion features are session-wide; plugin features may be attempt-based (Slider uses the final completed handle gesture; see `slider/types.ts` for exact formulas).. No giant optional-field interface.
- Edge cases return `0`/`null`, never `NaN`. Segments with `dt <= 0` are skipped. Variance is population variance.
- Features are descriptive measurements, not human/bot indicators.

- Time series (`motion-series.ts`) reuse the same primitives as the aggregates and are tested against them. The acceleration *sample timestamp* is the centre between the two velocity midpoints; this is display metadata and does not change any aggregate value, so `motion@1` is unchanged.

## Alternatives considered
- One feature interface with many optional fields: rejected (unclear which are present, grows without bound).

## Consequences
- Stored or exported features must keep the whole `FeatureSet` envelope.
- Two versions is slightly more ceremony than one; kept because meaning changes (break comparability) and bug fixes (do not) are different events for researchers.
