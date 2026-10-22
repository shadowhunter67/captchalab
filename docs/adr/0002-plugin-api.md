# 0002 — CAPTCHA plugin API and typed registry

## Context
CaptchaLab needs many CAPTCHAs whose challenge, answer and feature types all differ, yet a shared registry the web app, Inspect workbench and tests can use. The first draft erased plugins to `CaptchaPlugin<never, never, BaseCaptchaFeatures>`: after `registry.get(id)` nothing could be called (`generate(): never`, `verify` took no value). Building Slider (the first real plugin) also showed the interface was missing the challenge in `extractFeatures`, and a way to pass UI geometry.

## Decision

### Plugin shape
```ts
interface CaptchaPlugin<TId extends string, TChallenge, TAnswer, TFeatures extends BaseCaptchaFeatures, TFeatureContext = undefined> {
  readonly id: TId; readonly name: string; readonly version: string;
  generate(ctx: { rng }): TChallenge;
  verify(challenge, answer, interaction): VerificationResult;
  extractFeatures(challenge, interaction, context: TFeatureContext): FeatureSet<TFeatures>;
}
```
- `verify` = challenge correctness only. Behavioral features never decide pass/fail. The answer is final state only; trajectory stays in `InteractionSession`.
- `extractFeatures` now takes the **challenge** (features like release error are challenge-relative) and a plugin-specific **context** (rendered geometry in px). Challenges/answers use UI-size-independent (normalized) coordinates; the context is what maps pointer pixels to them.
- Returns a versioned `FeatureSet` (see ADR 0004).
- `defineCaptchaPlugin` is an identity helper that keeps the literal `id` and all generics.

### Registry: compile-time generic map
`createPluginRegistry({ slider: sliderPlugin, ... })` infers the map `M`; `registry.get<K extends keyof M>(id: K): M[K]` returns the exact plugin type. Consumers write no casts. A type-level check (`IdsMatchKeys`) plus a runtime check require each key to equal its plugin's `id`.
- `get` takes only known ids (unknown id = compile error; throws for untyped JS callers).
- `find(id: string)` is for untrusted strings (URL params) and returns the union of plugins, narrowable by `.id`.
- Helper types `ChallengeOf / AnswerOf / FeaturesOf / FeatureContextOf` extract per-plugin types.
- `AnyCaptchaPlugin` (all params widened to `unknown`) is used **only as the constraint** on the map. Method-style members keep parameter bivariance so concrete plugins satisfy it. It is never what a consumer receives.
- The concrete registry lives in `captcha-plugins` (`registry.ts`); `captcha-core` only provides the generic factory. Dependency direction: `captcha-plugins -> captcha-core`; the web app depends on `captcha-plugins`; core never imports plugins.

## Alternatives considered
- **Erased `unknown` registry** (`CaptchaPlugin<unknown, unknown, unknown>`): consumers need casts or runtime validators for every call; type information is lost exactly where it matters.
- **`never` registry (previous)**: sound but unusable; nothing callable after lookup.
- **Plugin definition / schema map** (separate `{ slider: { challenge: ..., answer: ... } }` type) and **discriminated descriptors**: duplicate every type in a second place that can drift from the implementation; the inferred map gets the same inference with no duplication.
- **Fully dynamic runtime plugin loading**: needs runtime schemas for challenge/answer, sandboxing and trust rules. Not an MVP goal.

## Consequences
- + Full inference from `registry.get("slider")`; negative cases (wrong answer type, wrong challenge, unknown id, missing context) are compile errors, enforced by `@ts-expect-error` tests under `tsc`.
- - Adding a CAPTCHA means adding it to the object in `captcha-plugins/src/registry.ts`. Intentional.
- - External/third-party plugins loaded at runtime are out of scope; they would need an adapter with runtime validation.
- - Because of method bivariance, the `AnyCaptchaPlugin` constraint does not prove a plugin's methods agree with each other; consistency comes from `defineCaptchaPlugin` generics at the definition site.
