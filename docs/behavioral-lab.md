# Behavioral Lab (v0.5)

The Behavioral Lab turns CaptchaLab from a set of demos into a small research bench. It records one attempt of yours inside a CaptchaLab challenge, computes behavioral signals, sets it beside a **generated** synthetic sample on the *same* challenge, and shows how an *experimental* rule baseline reads both.

It is not a bot detector. It never claims to tell a person from a program. See "What it does not claim" below.

## Routes

| Route | What |
|---|---|
| `/behavior` | Landing page: what the lab does and does not do, supported CAPTCHAs, signal groups, a signal explorer with the classifier's configured ranges, the research disclaimer. |
| `/compare?captcha=<id>` | Human attempt vs synthetic profile for one of six CAPTCHAs, plus classification, a generated reference distribution and an evaluation panel. |
| `/behavior/invisible` | A neutral pointer task with an experimental classification and a **simulated** escalation suggestion. |

Supported CAPTCHAs: Slider, Drag & Drop, Checkbox, Image Grid, Text, Rotation. Memory, Math, Sequence, Audio, Proof of Work and Shape Matching are not wired yet.

## Code map (all in `apps/web`)

- `lib/behavior/analysis.ts` – runs the plugin's own extractor, then derives a few extra signals from the **same session** (rhythm and variation). Output is a `BehavioralVector`.
- `lib/behavior/signal-catalog.ts` – every signal defined once (group, unit, bilingual label and meaning) and which CAPTCHA reports which.
- `lib/behavior/synthetic/` – profile metadata (`profiles.ts`) and generators (`generators.ts`, plus the Slider's in `lib/synthetic/slider-synthetic.ts`). They write normalized `InteractionSession` data directly.
- `lib/behavior/rules.ts`, `normalize.ts`, `classifier.ts` – the experimental classifier.
- `lib/behavior/compare.ts`, `observations.ts`, `reference.ts` – signal rows, descriptive sentences, generated reference distribution.
- `lib/behavior/invisible.ts` – the neutral task's analysis, its synthetic examples and the escalation mapping.
- `components/behavior/*`, `features/compare/*`, `features/behavior/*` – the UI.

The playground Session components of the six CAPTCHAs gained optional `onResult`, `onReset` and `showInspect` props; their behaviour is unchanged when those are not passed. The recorder, the plugin registry and the plugin contract were not touched.

## Signals and vectors

Signals are grouped for presentation: **Timing, Motion, Correction, Rhythm, Attempts, Input**. No CAPTCHA has to report every signal.

A `BehavioralVector` is `{ captchaId, featureSetVersion, sourceSchema, inputModality, values }`: derived numbers (or `null`) only. It holds no coordinates, no typed text and no answer. `featureSetVersion` is `behavior-signals@1`; bump it when any signal's meaning or unit changes. `sourceSchema` is the plugin feature schema the numbers came from (for example `slider@1;motion@1`).

Two choices worth knowing:

- Variation signals (`speedCv`, `sampleIntervalCv`, ...) are coefficients of variation over **consecutive pointer moves**; the press, the hold before the first move and the release are left out because a pause there says nothing about how the pointer moved.
- A signal that cannot be measured is `null`, never `0`. For example a keyboard-only run has no velocity at all.

## Synthetic profiles

A profile is a recipe for generated data on a CaptchaLab challenge. Nothing dispatches a DOM event, touches a third-party site or leaves the tab. The generators know the answer only because the lab made the challenge.

| CAPTCHA | Profiles |
|---|---|
| Slider | Linear, Eased, Noisy, Stop-and-correct |
| Drag & Drop | Direct, Eased, Noisy |
| Checkbox | Immediate, Delayed, Regular timing |
| Image Grid | Immediate selections, Uniform interval, Variable interval |
| Text | Uniform typing, Variable typing, Correction typing |
| Rotation | Direct, Eased, Overshoot-and-correct |

Same CAPTCHA, challenge, profile and synthetic seed give the same session. Only profiles marked random use the seed. Samples carry `{ profile, generator: "synthetic@1", seed }`. Text sessions keep the coarse key classes only (`Letter`, `Digit`, `Backspace`, `Enter`).

## The experimental classifier (`behavioral-baseline@1`)

1. Each CAPTCHA has a few rules (`rules.ts`), not one universal rule set. A rule reads one signal.
2. **Normalization** maps the raw value onto 0..1 inside a *configured* range (`lo`, `hi`). The ranges are set by hand. They are not learned from real people and are **not percentiles**; the UI calls the result an "experimental normalized signal".
3. The normalized value becomes **evidence**: `human-like | synthetic-like | neutral` with `weak | moderate | strong`. A middle band is neutral on purpose. "One-sided" rules (no correction, no overshoot) give no evidence at the low end, because none of something proves nothing.
4. Evidence is summed into a **balance** in −1..+1 (weighted, divided by the maximum possible). It is not a probability or a confidence.
5. Balance ≤ −0.2 is **Human-like**, ≥ +0.2 is **Synthetic-like**, in between is **Uncertain**. Fewer than two readable signals is always Uncertain.

The UI never shows a percentage and never says "bot". Every place that shows a classification carries: *Experimental classification for CaptchaLab lab data only. This result does not prove whether a real user is human or automated.*

### Known weakness, shown on purpose

Noisy and Variable synthetic profiles read as Human-like, and a person who drags in a perfectly straight line can read as Synthetic-like. The evaluation panel on `/compare` lets the user run the classifier over every profile of the current CAPTCHA to see this. There is no labeled human data, so no accuracy figure or confusion matrix is shown.

## Invisible / behavioral demo

After an explicit **Start**, the user clicks a target that moves four times inside a pad. Pointer events are recorded only inside the pad (keyboard activation of the target works too). The same signals and classifier produce a label. The *escalation suggestion* maps Human-like → "No extra challenge selected", Uncertain → a Checkbox demo, Synthetic-like → a Slider demo. It is a simulation: no redirect, no blocking, no access control, not a risk engine. Generated examples (Regular, Eased, Mixed, Variable) let the page be explored without input.

## Privacy

Everything is local: recording, signals, synthetic generation, classification. No upload, no analytics, no browser storage, no cookies, no device or canvas/WebGL/font fingerprinting, no cross-session tracking. The classifier reads derived numbers only. E2E checks cover requests, console output, storage writes and the fingerprinting APIs on `/behavior`, `/compare` and `/behavior/invisible`.

## What it does not claim

CaptchaLab experiments with distinguishing lab-generated interaction patterns. It does not detect bots. Device, assistive tools, motor differences, network or render timing and the input method all change behavior, and a real person can look synthetic while a synthetic sample can look human-like. No health inference is drawn from any of it.
