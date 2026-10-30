import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createPluginRegistry,
  createRng,
  defineCaptchaPlugin,
  type AnswerOf,
  type ChallengeOf,
  type FeatureContextOf,
  type FeaturesOf,
  type InteractionSession,
} from "@captchalab/captcha-core";
import { checkboxPlugin, dragDropPlugin, audioPlugin, matchKeyPlugin, tileGamePlugin, proofOfSpacePlugin, browserCapabilityPlugin, imageGridPlugin, mathLogicPlugin, memoryPlugin, proofOfWorkPlugin, registry, rotationPlugin, sequencePlugin, shapeMatchingPlugin, sliderPlugin, textPlugin } from "../index";
import type { SliderAnswer, SliderChallenge, SliderFeatureContext, SliderFeatures } from "../slider";
import type { CheckboxAnswer, CheckboxChallenge, CheckboxFeatures } from "../checkbox";
import type { DragDropAnswer, DragDropChallenge, DragDropFeatureContext, DragDropFeatures } from "../drag-drop";

const emptySession: InteractionSession = {
  schemaVersion: 2,
  id: "s",
  captchaId: "slider",
  startedAt: 0,
  durationMs: 0,
  events: [],
  inputModality: "none",
};

// A second plugin with different types, to prove the map holds heterogeneous generics.
const fakeTextPlugin = defineCaptchaPlugin({
  id: "fake-text",
  name: "Text",
  version: "0",
  generate: (): { text: string } => ({ text: "abc" }),
  verify: (c: { text: string }, a: { typed: string }) => ({ passed: c.text === a.typed, reason: "" }),
  extractFeatures: (_c: { text: string }, i: InteractionSession) => ({
    schemaVersion: "t@1",
    extractorVersion: "t@1",
    features: { completionTime: i.durationMs, eventCount: 0, typedLength: 0 },
  }),
});
const twoPlugins = createPluginRegistry({ slider: sliderPlugin, "fake-text": fakeTextPlugin });

describe("typed registry (runtime)", () => {
  it("returns the plugin for a known id and lists ids", () => {
    expect(registry.get("slider")).toBe(sliderPlugin);
    expect(registry.ids).toEqual(["slider", "checkbox", "drag-drop", "rotation", "text", "image-grid", "shape-matching", "math-logic", "sequence", "memory", "proof-of-work", "audio", "match-key", "tile-game", "proof-of-space", "browser-capability"]);
    expect(twoPlugins.ids).toEqual(["slider", "fake-text"]);
  });

  it("find() handles untrusted strings; get() throws for untyped callers", () => {
    expect(registry.find("slider")?.id).toBe("slider");
    expect(registry.find("nope")).toBeUndefined();
    expect(registry.has("slider")).toBe(true);
    expect(registry.has("nope")).toBe(false);
    expect(() => (registry.get as (id: string) => unknown)("nope")).toThrow(/Unknown CAPTCHA plugin/);
  });

  it("rejects unbranded / malformed plugins and freezes branded ones", () => {
    const { id, name, version, generate, verify, extractFeatures } = sliderPlugin;
    const plain = { id, name, version, generate, verify, extractFeatures };
    expect(() => createPluginRegistry({ slider: plain } as never)).toThrow(/defineCaptchaPlugin/);
    expect(() => createPluginRegistry({ slider: null } as never)).toThrow(/defineCaptchaPlugin/);
    expect(Object.isFrozen(sliderPlugin)).toBe(true);
    expect(() => {
      (sliderPlugin as { id: string }).id = "other";
    }).toThrow(TypeError);
  });

  it("rejects a plugin registered under a different key", () => {
    const wrong = { other: sliderPlugin } as unknown as Parameters<typeof createPluginRegistry>[0];
    expect(() => createPluginRegistry(wrong)).toThrow(/id is "slider"/);
  });

  it("end-to-end via registry without casts", () => {
    const slider = registry.get("slider");
    const challenge = slider.generate({ rng: createRng(7) });
    const result = slider.verify(challenge, { position: challenge.target }, emptySession);
    expect(result.passed).toBe(true);
  });
});

describe("typed registry (compile time)", () => {
  it("preserves exact types per id", () => {
    const slider = registry.get("slider");
    expectTypeOf(slider).toEqualTypeOf<typeof sliderPlugin>();
    expectTypeOf(slider.generate).returns.toEqualTypeOf<SliderChallenge>();
    expectTypeOf<ChallengeOf<typeof slider>>().toEqualTypeOf<SliderChallenge>();
    expectTypeOf<AnswerOf<typeof slider>>().toEqualTypeOf<SliderAnswer>();
    expectTypeOf<FeaturesOf<typeof slider>>().toEqualTypeOf<SliderFeatures>();
    expectTypeOf<FeatureContextOf<typeof slider>>().toEqualTypeOf<SliderFeatureContext>();
    expectTypeOf(slider.id).toEqualTypeOf<"slider">();
    // Heterogeneous map keeps both.
    expectTypeOf<AnswerOf<ReturnType<typeof twoPlugins.get<"fake-text">>>>().toEqualTypeOf<{ typed: string }>();
    expectTypeOf(twoPlugins.find("x")).toEqualTypeOf<typeof sliderPlugin | typeof fakeTextPlugin | undefined>();
  });

  it("defineCaptchaPlugin infers the context requirement from the implementation", () => {
    const needsCtx = defineCaptchaPlugin({
      id: "needs-ctx",
      name: "",
      version: "",
      generate: () => ({ n: 1 }),
      verify: (_c: { n: number }, _a: { ok: boolean }, _i: InteractionSession) => ({ passed: true, reason: "" }),
      extractFeatures: (_c: { n: number }, i: InteractionSession, context: { width: number }) => ({
        schemaVersion: "",
        extractorVersion: "",
        features: { completionTime: i.durationMs + context.width, eventCount: 0 },
      }),
    });
    expectTypeOf(needsCtx.extractFeatures).parameters.toEqualTypeOf<[{ n: number }, InteractionSession, { width: number }]>();
    const free = defineCaptchaPlugin({
      id: "free",
      name: "",
      version: "",
      generate: () => ({ n: 1 }),
      verify: (_c: { n: number }, _a: { ok: boolean }, _i: InteractionSession) => ({ passed: true, reason: "" }),
      extractFeatures: (_c: { n: number }, i: InteractionSession) => ({
        schemaVersion: "",
        extractorVersion: "",
        features: { completionTime: i.durationMs, eventCount: 0 },
      }),
    });
    expectTypeOf(free.extractFeatures).parameters.toEqualTypeOf<[{ n: number }, InteractionSession]>();
    const reg = createPluginRegistry({ "needs-ctx": needsCtx, free });
    expect(reg.ids).toEqual(["needs-ctx", "free"]);
    expect(reg.get("free").extractFeatures({ n: 1 }, emptySession).features.completionTime).toBe(0);
    expect(reg.get("needs-ctx").extractFeatures({ n: 1 }, emptySession, { width: 5 }).features.completionTime).toBe(5);
  });

  it("checkbox keeps its own exact types (second plugin, different generics)", () => {
    const checkbox = registry.get("checkbox");
    expectTypeOf(checkbox).toEqualTypeOf<typeof checkboxPlugin>();
    expectTypeOf(checkbox.id).toEqualTypeOf<"checkbox">();
    expectTypeOf<ChallengeOf<typeof checkbox>>().toEqualTypeOf<CheckboxChallenge>();
    expectTypeOf<AnswerOf<typeof checkbox>>().toEqualTypeOf<CheckboxAnswer>();
    expectTypeOf<FeaturesOf<typeof checkbox>>().toEqualTypeOf<CheckboxFeatures>();
    expectTypeOf<FeatureContextOf<typeof checkbox>>().toEqualTypeOf<undefined>();
    // Context-free plugins are called without a context; plugins that need one still require it.
    expectTypeOf(checkbox.extractFeatures).parameters.toEqualTypeOf<[CheckboxChallenge, InteractionSession]>();
    expectTypeOf(registry.get("slider").extractFeatures).parameters.toEqualTypeOf<
      [SliderChallenge, InteractionSession, SliderFeatureContext]
    >();
    expectTypeOf(registry.find("x")).toEqualTypeOf<
      typeof sliderPlugin | typeof checkboxPlugin | typeof dragDropPlugin | typeof rotationPlugin | typeof textPlugin | typeof imageGridPlugin | typeof shapeMatchingPlugin | typeof mathLogicPlugin | typeof sequencePlugin | typeof memoryPlugin | typeof proofOfWorkPlugin | typeof audioPlugin | typeof matchKeyPlugin | typeof tileGamePlugin | typeof proofOfSpacePlugin | typeof browserCapabilityPlugin | undefined
    >();
    const dd = registry.get("drag-drop");
    expectTypeOf(dd).toEqualTypeOf<typeof dragDropPlugin>();
    expectTypeOf(dd.id).toEqualTypeOf<"drag-drop">();
    expectTypeOf<ChallengeOf<typeof dd>>().toEqualTypeOf<DragDropChallenge>();
    expectTypeOf<AnswerOf<typeof dd>>().toEqualTypeOf<DragDropAnswer>();
    expectTypeOf<FeaturesOf<typeof dd>>().toEqualTypeOf<DragDropFeatures>();
    expectTypeOf<FeatureContextOf<typeof dd>>().toEqualTypeOf<DragDropFeatureContext>();
  });

  it("rejects misuse (checked by tsc; never executed)", () => {
    const misuse = () => {
      const slider = registry.get("slider");
      const text = twoPlugins.get("fake-text");
      const challenge = slider.generate({ rng: Math.random });
      // @ts-expect-error unknown captcha id
      registry.get("nope");
      // @ts-expect-error a slider answer is not a checkbox answer
      registry.get("checkbox").verify({ id: "x", expectedChecked: true }, { position: 0.5 } satisfies SliderAnswer, emptySession);
      // @ts-expect-error a checkbox challenge is not a slider challenge
      slider.verify({ id: "x", expectedChecked: true }, { position: 0.5 }, emptySession);
      // @ts-expect-error SliderAnswer is not a text answer
      text.verify({ text: "x" }, { position: 0.5 } satisfies SliderAnswer, emptySession);
      // @ts-expect-error text challenge is not a slider challenge
      slider.verify({ text: "x" }, { position: 0.5 }, emptySession);
      // @ts-expect-error answer must be a SliderAnswer
      slider.verify(challenge, { typed: "x" }, emptySession);
      // @ts-expect-error layout context is required for slider features
      slider.extractFeatures(challenge, emptySession);
      // @ts-expect-error a context-free plugin takes no context argument
      registry.get("checkbox").extractFeatures({ id: "x", expectedChecked: true }, emptySession, undefined);
      // @ts-expect-error hand-written plugins (even with matching shape) are not registrable
      createPluginRegistry({ broken: { id: "broken", name: "", version: "", generate: () => ({}), verify: () => ({ passed: true, reason: "" }), extractFeatures: () => ({ schemaVersion: "", extractorVersion: "", features: { completionTime: 0, eventCount: 0 } }) } });
      defineCaptchaPlugin({
        id: "incoherent",
        name: "",
        version: "",
        generate: () => ({ target: 0.5 }),
        // @ts-expect-error verify's challenge type must match generate's
        verify: (_c: string, _a: Date, _i: InteractionSession) => ({ passed: true, reason: "" }),
        extractFeatures: (_c: { target: number }, i: InteractionSession) => ({
          schemaVersion: "",
          extractorVersion: "",
          features: { completionTime: i.durationMs, eventCount: 0 },
        }),
      });
      // @ts-expect-error key must equal plugin id
      createPluginRegistry({ wrongKey: sliderPlugin });
    };
    expect(typeof misuse).toBe("function");
  });
});
