# 0005 — Replay, session markers, motion series and Inspect primitives

## Context
Phase 1B shipped a Slider-bound thin Inspect and a replay that animated by hand-rolled `requestAnimationFrame`, could not show the handle reset caused by "Try again" (not an input event), and had no time-series. The next CAPTCHAs need the same Inspect building blocks.

## Decision

### Motion series live in `captcha-core` (pure math)
`buildMotionSeries(tracks)` / `sessionMotionSeries(session)` return `segments[]`, one per track, each with `velocity` and `acceleration` samples (definitions in `features/motion-series.ts`).
- velocity `v_i = dist(p_{i-1}, p_i) / dt * 1000` px/s at the segment midpoint; acceleration `a_j = dv / d(midpoint time) * 1000` px/s² at the centre between the two midpoints (changed from "second midpoint"; aggregate features unaffected).
- Built from the same `segmentSpeeds`/`accelerations` the aggregate features use, so charts and feature table cannot disagree (tested for max velocity, max |acceleration|, variance).
- Segments are tracks/gestures: never joined across pointerup/cancel, a new press, another contact, or a retry.
- Rendering concerns (scales, ticks, SVG) stay in `apps/web/lib/inspect/chart.ts`.

### Replay = pure clock + RAF driver, in the web app
`replay-clock.ts` is a pure state machine (idle/playing/paused/finished, speeds 0.5/1/2, seek, tick); `replay-driver.ts` is the only timer. Anchor rule: any operation that changes the time→clock mapping (pause, speed change, seek, restart) first settles elapsed time at the old speed and re-bases the anchor (found by review: a stale anchor leaked into seek/speed changes). Scrubbing while playing keeps playing; idle/paused/finished scrub to paused (finished→paused avoids surprise autoplay); reaching the end finishes. Listeners update SVG imperatively; React state carries only status/speed. Core keeps only the timeline math (`createPointerTimeline`).

### Session markers are not events
`SessionMarker` (`{type:"attempt-reset", t, position}`) is recorded by the web session layer using `recorder.elapsedMs()` (monotonic, shared with event `t`) and lives beside, never inside, `InteractionSession`. Replay derives the handle state from gestures + markers (`createHandleReplay`); the replay range and timeline domain include markers so a trailing reset is reachable. A UI action is therefore never disguised as user input, and the event schema stays unchanged. Kept in the web layer until a second CAPTCHA needs its own marker.

### Inspect primitives are generic; selectors are plugin-specific
`components/inspect` + `lib/inspect` (VerificationSummary, MetricTable over `InspectMetric` descriptors, TrajectoryView over generic geometry, MotionChart, EventTimeline + EventInspector, ReplayControls) know nothing about any CAPTCHA. The plugin's web feature chooses data and wording: `slider-view-data.ts` (which tracks, which metrics, drag-only charts) and `SliderInspect` (composition). Selection is one value, an index into `session.events`, bound to the session snapshot; timeline, inspector, trajectory marker and chart crosshairs derive from it.

## Alternatives considered
- Put the replay clock in core: rejected, it is browser orchestration (timers).
- Inject reset as a fake pointer event: rejected, pollutes the schema and every feature.
- Extract a `packages/visualization` now: deferred until a second consumer exists.
- Chart/D3 library: unnecessary for two line charts and a timeline.

## Consequences
- A second CAPTCHA writes a `*-view-data.ts` selector set and a composition component; it reuses all primitives.
- Known limits: `MetricUnit` is a closed set (descriptors can override with `format`); timeline density bins are pointer-only (keyboard users step with Previous/Next); the replay assumes one real pointer.
