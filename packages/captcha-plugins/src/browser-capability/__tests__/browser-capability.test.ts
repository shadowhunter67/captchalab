import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  BC_CHECK_IDS,
  BC_RUN_TARGET,
  BC_VARIANTS,
  MAX_WORKLOAD,
  browserCapabilityPlugin,
  computeLocal,
  extractBcFeatures,
  generateBcChallenge,
  probeCapability,
  verifyBcAnswer,
  type BcAnswer,
  type BcChallenge,
} from "../../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) => generateBcChallenge({ rng: createRng(seed), variantId, difficulty });
const allTrue = (c: BcChallenge): BcAnswer => ({
  checks: Object.fromEntries(c.checks.filter((id) => id !== "compute").map((id) => [id, true])),
  computed: computeLocal(c.seed, c.workload),
});

describe("generator", () => {
  it("is deterministic and bounded for every variant, difficulty and seed", () => {
    for (const v of BC_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        for (let seed = 0; seed < 10; seed++) {
          const a = gen(seed, v.id, d);
          expect(a).toEqual(gen(seed, v.id, d));
          expect(a.workload).toBeLessThanOrEqual(MAX_WORKLOAD);
          expect(a.checks[0]).toBe("javascript");
        }
      }
    }
  });
  it("Basic asks for 4 checks, Extended for all 7", () => {
    expect(gen(1, "basic").checks).toHaveLength(4);
    expect(gen(1, "extended").checks).toEqual([...BC_CHECK_IDS]);
  });
});

describe("verifier", () => {
  const c = gen(7, "extended", "easy");
  it("passes when every API is available and the computation matches", () => {
    expect(verifyBcAnswer(c, allTrue(c)).passed).toBe(true);
  });
  it("fails and names the missing capability when one is unavailable", () => {
    const a = allTrue(c);
    const r = verifyBcAnswer(c, { ...a, checks: { ...a.checks, worker: false } });
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("worker");
  });
  it("does not trust the page about the computation", () => {
    const r = verifyBcAnswer(c, { ...allTrue(c), computed: computeLocal(c.seed, c.workload) ^ 1 });
    expect(r.passed).toBe(false);
    expect(r.reason).toContain("compute");
    expect(verifyBcAnswer(c, { checks: allTrue(c).checks }).passed).toBe(false);
  });
  it("rejects malformed answers and challenges without throwing", () => {
    expect(verifyBcAnswer(c, null as never).passed).toBe(false);
    expect(verifyBcAnswer(c, { checks: { javascript: true } }).passed).toBe(false);
    expect(verifyBcAnswer(c, { checks: "yes" as never }).passed).toBe(false);
    expect(verifyBcAnswer({ ...c, workload: MAX_WORKLOAD * 1000 }, allTrue(c)).passed).toBe(false);
    expect(verifyBcAnswer({ ...c, checks: ["gpu" as never] }, allTrue(c)).passed).toBe(false);
    expect(verifyBcAnswer(null as never, allTrue(c)).passed).toBe(false);
  });
  it("the plugin is registered under its id", () => {
    expect(browserCapabilityPlugin.id).toBe("browser-capability");
  });
});

describe("probeCapability: availability only", () => {
  it("reports booleans from the presence of names, nothing else", () => {
    const full = { crypto: { subtle: {} }, HTMLCanvasElement: class {}, CanvasRenderingContext2D: class {}, Worker: class {}, AudioContext: class {}, PointerEvent: class {} };
    for (const id of BC_CHECK_IDS.filter((x) => x !== "compute")) expect(probeCapability(full, id)).toBe(true);
    for (const id of BC_CHECK_IDS.filter((x) => x !== "compute" && x !== "javascript")) expect(probeCapability({}, id)).toBe(false);
    expect(probeCapability({ crypto: {} }, "webcrypto")).toBe(false);
    expect(probeCapability({ webkitAudioContext: class {} }, "webaudio")).toBe(true);
  });
  it("never calls or constructs anything it finds", () => {
    const touched: string[] = [];
    const trap = (name: string) => new Proxy(function () {}, { apply: () => touched.push(name), construct: () => (touched.push(name), {}), get: (_t, p) => (touched.push(`${name}.${String(p)}`), undefined) });
    const env = { HTMLCanvasElement: trap("c"), CanvasRenderingContext2D: trap("c2"), Worker: trap("w"), AudioContext: trap("a"), PointerEvent: trap("p"), crypto: { subtle: trap("s") } };
    for (const id of BC_CHECK_IDS.filter((x) => x !== "compute")) probeCapability(env, id);
    expect(touched).toEqual([]);
  });
  it("source uses no fingerprinting or storage API", () => {
    const dir = join(__dirname, "..");
    const forbidden = /toDataURL|getImageData|getContext|createOscillator|new AudioContext|new Worker|userAgent|hardwareConcurrency|deviceMemory|getBattery|enumerateDevices|WEBGL|getParameter|localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.(platform|languages|plugins|connection)|screen\.(width|height|colorDepth)/;
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
      const code = readFileSync(join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, f).not.toMatch(forbidden);
    }
  });
});

describe("feature extractor", () => {
  const c = gen(3, "basic", "easy");
  const press = (t: number): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: BC_RUN_TARGET },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: BC_RUN_TARGET },
  ];
  const session = (events: InteractionEvent[]): InteractionSession => ({ schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "browser-capability", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events) });
  it("counts presses and capability answers (golden)", () => {
    const f = extractBcFeatures(c, session(press(120)), { supported: 4 });
    expect(f.features).toMatchObject({ runCount: 1, attemptCount: 1, checkCount: 4, supportedCount: 4 });
    expect(f.schemaVersion).toBe("browser-capability@2");
  });
  it("exposes no timing or device-performance field, in the types, the features or the view", () => {
    const f = extractBcFeatures(c, session(press(120)), { supported: 4 });
    expect(Object.keys(f.features).filter((k) => /time|duration|ms$|speed|perf/i.test(k) && k !== "completionTime")).toEqual([]);
    const src = ["types.ts", "feature-extractor.ts", "capability.ts", "verifier.ts", "plugin.ts", "generator.ts"].map((n) => readFileSync(join(__dirname, "..", n), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")).join("\n");
    expect(src).not.toMatch(/performance\.now|Date\.now|probeMs|computeMs|probeTime|computeTime|reactionTime|hrtime/);
  });
  it("without a finished run the count is null, never zero; a bad count is ignored", () => {
    expect(extractBcFeatures(c, session(press(100)), { supported: null }).features).toMatchObject({ runCount: 1, supportedCount: null });
    expect(extractBcFeatures(c, session([]), { supported: Number.NaN }).features).toMatchObject({ supportedCount: null });
    expect(extractBcFeatures(c, session([]), { supported: 99 }).features).toMatchObject({ supportedCount: null });
  });
});
