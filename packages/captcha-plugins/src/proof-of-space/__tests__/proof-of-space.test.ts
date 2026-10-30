import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  CHECKSUM_START,
  MAX_SPACE_BYTES,
  POS_CANCEL_TARGET,
  POS_START_TARGET,
  POS_VARIANTS,
  byteAt,
  checksumOfSpace,
  checksumUpdate,
  extractPosFeatures,
  fillRange,
  generatePosChallenge,
  proofOfSpacePlugin,
  sampleValues,
  samplePositions,
  verifyPosAnswer,
  type PosChallenge,
} from "../../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) => generatePosChallenge({ rng: createRng(seed), variantId, difficulty });
const solve = (c: PosChallenge) =>
  c.kind === "checksum" ? { checksum: checksumOfSpace(c.seed, c.bytes) } : { samples: sampleValues(c.seed, samplePositions(c.seed, c.bytes, c.sampleCount)) };

describe("generator", () => {
  it("is deterministic and bounded for every variant, difficulty and seed", () => {
    for (const v of POS_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        for (let seed = 0; seed < 20; seed++) {
          const c = gen(seed, v.id, d);
          expect(c).toEqual(gen(seed, v.id, d));
          expect(c.bytes).toBe(v.difficulties[d]!.bytes);
          expect(c.bytes).toBeLessThanOrEqual(MAX_SPACE_BYTES);
          expect(Number.isInteger(c.seed) && c.seed >= 0 && c.seed <= 0xffffffff).toBe(true);
          expect(verifyPosAnswer(c, solve(c)).passed).toBe(true);
        }
      }
    }
  });
  it("difficulty grows the space: 256 KB, 1 MB, 4 MB; an unknown variant is rejected", () => {
    expect([gen(1, "sampled", "easy"), gen(1, "sampled", "medium"), gen(1, "sampled", "hard")].map((c) => c.bytes)).toEqual([262144, 1048576, 4194304]);
    expect(() => gen(1, "nope")).toThrow();
  });
  it("different seeds give different spaces", () => {
    expect(gen(1).seed).not.toBe(gen(2).seed);
  });
});

describe("space", () => {
  it("a filled buffer agrees with the random-access byte function and the seed-only checksum", () => {
    const c = gen(7, "checksum", "easy");
    const buf = new Uint8Array(c.bytes);
    // Filled in uneven chunks, as a page does.
    for (let from = 0; from < c.bytes; from += 40000) fillRange(buf, c.seed, from, Math.min(c.bytes, from + 40000));
    for (const i of [0, 1, 4095, c.bytes - 1]) expect(buf[i]).toBe(byteAt(c.seed, i));
    let h = CHECKSUM_START;
    for (let from = 0; from < c.bytes; from += 65536) h = checksumUpdate(h, buf, from, Math.min(c.bytes, from + 65536));
    expect(h).toBe(checksumOfSpace(c.seed, c.bytes));
  });
  it("sample positions are in range and fixed by the seed", () => {
    const p = samplePositions(123, 262144, 16);
    expect(p).toHaveLength(16);
    expect(p.every((x) => Number.isInteger(x) && x >= 0 && x < 262144)).toBe(true);
    expect(samplePositions(123, 262144, 16)).toEqual(p);
    expect(samplePositions(124, 262144, 16)).not.toEqual(p);
  });
});

describe("verifier", () => {
  const sampled = gen(5, "sampled", "easy");
  const sum = gen(5, "checksum", "easy");
  it("accepts a valid proof of each kind and rejects an invalid one", () => {
    expect(verifyPosAnswer(sampled, solve(sampled)).passed).toBe(true);
    expect(verifyPosAnswer(sum, solve(sum)).passed).toBe(true);
    const bad = [...(solve(sampled).samples as number[])];
    bad[3] = (bad[3]! + 1) % 256;
    expect(verifyPosAnswer(sampled, { samples: bad }).passed).toBe(false);
    expect(verifyPosAnswer(sum, { checksum: (checksumOfSpace(sum.seed, sum.bytes) + 1) >>> 0 }).passed).toBe(false);
  });
  it("a proof for another challenge or the wrong kind fails", () => {
    const other = gen(6, "sampled", "easy");
    expect(verifyPosAnswer(sampled, solve(other)).passed).toBe(false);
    expect(verifyPosAnswer(sampled, solve(sum)).passed).toBe(false);
    expect(verifyPosAnswer(sum, solve(sampled)).passed).toBe(false);
  });
  it("never throws on malformed answers", () => {
    for (const a of [undefined, null, 1, "x", {}, { samples: "x" }, { samples: [] }, { samples: [999, 1, 2] }, { checksum: -1 }, { checksum: 1.5 }, { checksum: "1" }]) {
      expect(verifyPosAnswer(sampled, a as never).passed).toBe(false);
      expect(verifyPosAnswer(sum, a as never).passed).toBe(false);
    }
  });
  it("rejects an oversized or malformed challenge without allocating or recomputing it", () => {
    const huge = { ...sum, bytes: 2 ** 31 };
    const t0 = Date.now();
    for (const bad of [undefined, null, 5, {}, huge, { ...sum, bytes: MAX_SPACE_BYTES + 1 }, { ...sum, bytes: 10 }, { ...sampled, sampleCount: 1000 }, { ...sum, seed: -1 }, { ...sum, kind: "x" }]) {
      expect(verifyPosAnswer(bad as never, solve(sum)).passed).toBe(false);
    }
    expect(Date.now() - t0).toBeLessThan(500); // no huge work was attempted
  });
  it("plugin.verify matches the verifier", () => {
    expect(proofOfSpacePlugin.verify(sampled, solve(sampled), { schemaVersion: SCHEMA_VERSION } as never).passed).toBe(true);
  });
});

describe("features", () => {
  const c = gen(3, "sampled", "easy");
  const press = (t: number, target: string): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
  ];
  const session = (events: InteractionEvent[]): InteractionSession => ({ schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "proof-of-space", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events) });
  const run = { allocatedBytes: 262144, fillMs: 12, proofMs: 3, operations: 262160 };

  it("counts presses and reports the computation (golden)", () => {
    const f = extractPosFeatures(c, session([...press(100, POS_START_TARGET), ...press(200, POS_CANCEL_TARGET), ...press(300, POS_START_TARGET)]), { run, verificationMs: 5 });
    expect(f.features).toMatchObject({ reactionTime: 100, startCount: 2, cancelCount: 1, attemptCount: 2, allocatedBytes: 262144, fillTime: 12, verificationTime: 5, totalTime: 20, operations: 262160 });
    expect(f.schemaVersion).toBe("proof-of-space@1");
  });
  it("without a finished run the computation metrics are null, never zero", () => {
    const f = extractPosFeatures(c, session(press(100, POS_START_TARGET)), { run: null, verificationMs: null });
    expect(f.features).toMatchObject({ startCount: 1, allocatedBytes: null, fillTime: null, verificationTime: null, totalTime: null, operations: null });
  });
  it("a bad run from the page is ignored", () => {
    const f = extractPosFeatures(c, session([]), { run: { ...run, fillMs: Number.NaN }, verificationMs: 1 });
    expect(f.features).toMatchObject({ fillTime: null, totalTime: null });
  });
  it("keyboard presses count, and only the two buttons are events", () => {
    const f = extractPosFeatures(c, session([{ t: 50, type: "keydown", code: "Enter", target: POS_START_TARGET }, { t: 60, type: "keydown", code: "Enter", target: "other" }]), { run: null, verificationMs: null });
    expect(f.features).toMatchObject({ startCount: 1, reactionTime: 50, inputModality: "keyboard" });
  });
});
