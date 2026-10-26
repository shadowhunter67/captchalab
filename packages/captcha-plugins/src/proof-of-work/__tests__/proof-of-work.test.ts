import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  POW_CANCEL_TARGET,
  POW_START_TARGET,
  POW_VARIANTS,
  extractPowFeatures,
  generatePowChallenge,
  hasLeadingZeroBits,
  meetsDifficulty,
  powHash,
  proofOfWorkPlugin,
  searchNonces,
  sha256Hex,
  verifyPowAnswer,
  type PowChallenge,
} from "../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) => generatePowChallenge({ rng: createRng(seed), variantId, difficulty });
const solve = (c: PowChallenge): number => searchNonces(c, 0, 5_000_000) as number;

describe("sha256", () => {
  it("matches Node's SHA-256 on known and varied inputs", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const inputs = ["a".repeat(55), "a".repeat(56), "a".repeat(63), "a".repeat(64), "a".repeat(65), "héllo wörld ✓", "0123456789abcdef:123456", "x".repeat(1000)];
    for (const s of inputs) expect(sha256Hex(s)).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
  });
});

describe("difficulty checks", () => {
  it("counts leading zero bits, including partial nibbles", () => {
    expect(hasLeadingZeroBits("00f", 8)).toBe(true);
    expect(hasLeadingZeroBits("0ff", 8)).toBe(false);
    expect(hasLeadingZeroBits("07f", 5)).toBe(true);
    expect(hasLeadingZeroBits("08f", 5)).toBe(false);
    expect(hasLeadingZeroBits("1", 4)).toBe(false);
    expect(hasLeadingZeroBits("0", 0)).toBe(true);
    expect(hasLeadingZeroBits("zz", 4)).toBe(false);
  });
  it("prefix and bits challenges use their own rule", () => {
    expect(meetsDifficulty({ kind: "prefix", prefix: "00", bits: 0 }, "00ab")).toBe(true);
    expect(meetsDifficulty({ kind: "prefix", prefix: "00", bits: 0 }, "0aab")).toBe(false);
    expect(meetsDifficulty({ kind: "bits", prefix: "", bits: 9 }, "007f")).toBe(true);
    expect(meetsDifficulty({ kind: "bits", prefix: "", bits: 9 }, "00ff")).toBe(false);
  });
});

describe("generator", () => {
  it("is deterministic and records its configuration", () => {
    for (const v of POW_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        const c = gen(3, v.id, d);
        expect(c).toEqual(gen(3, v.id, d));
        expect(c.input).toMatch(/^[0-9a-f]{16}$/);
        expect(c.config).toMatchObject({ variantId: v.id, difficulty: d, parameters: { algorithm: "SHA-256" } });
        expect(c.kind).toBe(v.id === "hash-prefix" ? "prefix" : "bits");
      }
    }
    expect(gen(3, "hash-prefix", "medium").prefix).toBe("000");
  });
  it("different seeds give different challenges", () => {
    expect(gen(1).input).not.toBe(gen(2).input);
  });
});

describe("search and verification", () => {
  it("the first valid nonce is always the same and verifies independently", () => {
    for (const v of POW_VARIANTS.variants) {
      const c = gen(7, v.id, "easy");
      const n = solve(c);
      expect(solve(c)).toBe(n);
      expect(verifyPowAnswer(c, { nonce: n }).passed).toBe(true);
      // check with Node's own hash, not the plugin's
      const hex = createHash("sha256").update(`${c.input}:${n}`).digest("hex");
      expect(c.kind === "prefix" ? hex.startsWith(c.prefix) : hasLeadingZeroBits(hex, c.bits)).toBe(true);
      expect(powHash(c, n)).toBe(hex);
      // and no smaller nonce works
      expect(searchNonces(c, 0, n)).toBeNull();
    }
  });
  it("searching in chunks finds the same nonce as one long search", () => {
    const c = gen(11, "hash-prefix", "easy");
    let from = 0;
    let found: number | null = null;
    while (found === null) {
      found = searchNonces(c, from, 50);
      from += 50;
    }
    expect(found).toBe(solve(c));
  });
  it("a wrong or malformed proof fails and never throws", () => {
    const c = gen(7, "hash-prefix", "medium");
    const n = solve(c);
    expect(verifyPowAnswer(c, { nonce: n + 1 }).passed).toBe(meetsDifficulty(c, powHash(c, n + 1))); // almost surely false, but decided by the hash
    for (const bad of [undefined, null, {}, { nonce: -1 }, { nonce: 1.5 }, { nonce: "5" }, { nonce: Number.NaN }, { nonce: 2 ** 41 }, 5]) {
      expect(verifyPowAnswer(c, bad as never).passed).toBe(false);
    }
    for (const ch of [undefined, null, {}, { ...c, input: "zz" }, { ...c, algorithm: "MD5" }, { ...c, kind: "other" }, { ...c, prefix: "" }]) {
      expect(verifyPowAnswer(ch as never, { nonce: n }).passed).toBe(false);
    }
  });
  it("a nonce for another challenge does not verify (with overwhelming probability)", () => {
    const a = gen(21, "hash-prefix", "medium");
    const b = gen(22, "hash-prefix", "medium");
    const n = solve(a);
    expect(verifyPowAnswer(b, { nonce: n }).passed).toBe(meetsDifficulty(b, powHash(b, n)));
  });
  it("more difficulty means more work (median over seeds)", () => {
    const median = (d: CaptchaDifficulty) => {
      const counts = Array.from({ length: 15 }, (_, s) => solve(gen(100 + s, "hash-prefix", d)) + 1).sort((x, y) => x - y);
      return counts[7] as number;
    };
    const [e, m] = [median("easy"), median("medium")];
    expect(m).toBeGreaterThan(e);
  });
  it("ignores the interaction", () => {
    const c = gen(7, "hash-prefix", "easy");
    const empty: InteractionSession = { schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "proof-of-work", startedAt: 0, durationMs: 0, events: [], inputModality: "none" };
    expect(proofOfWorkPlugin.verify(c, { nonce: solve(c) }, empty).passed).toBe(true);
  });
});

describe("features", () => {
  const c = gen(7, "hash-prefix", "easy");
  const n = solve(c);
  const press = (t: number, target: string): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target },
  ];
  const session = (events: InteractionEvent[], durationMs = 3000): InteractionSession => ({
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "proof-of-work", startedAt: 0, durationMs, events, inputModality: inferModality(events),
  });

  it("computation metrics come from the run; start and cancel counts from the presses", () => {
    const events = [...press(100, POW_START_TARGET), ...press(400, POW_CANCEL_TARGET), ...press(900, POW_START_TARGET)];
    const f = extractPowFeatures(c, session(events), { run: { nonce: n, iterations: n + 1, computationMs: 250 } }).features;
    expect(f).toMatchObject({ reactionTime: 100, startCount: 2, cancelCount: 1, attemptCount: 2, computationTime: 250, iterations: n + 1, nonce: n });
    expect(f.iterationsPerSecond).toBeCloseTo((n + 1) / 0.25);
    expect(f.hashPrefix).toBe(powHash(c, n).slice(0, 12));
  });
  it("no run: computation metrics are null; zero time gives no rate", () => {
    const f = extractPowFeatures(c, session([]), { run: null }).features;
    expect(f).toMatchObject({ computationTime: null, iterations: null, iterationsPerSecond: null, nonce: null, hashPrefix: null, startCount: 0 });
    expect(extractPowFeatures(c, session([]), { run: { nonce: n, iterations: 5, computationMs: 0 } }).features.iterationsPerSecond).toBeNull();
    expect(extractPowFeatures(c, session([]), { run: { nonce: -1, iterations: 5, computationMs: 5 } }).features.nonce).toBeNull();
  });
  it("only a handful of events exist however many hashes were computed (no event per iteration)", () => {
    const f = extractPowFeatures(c, session([...press(10, POW_START_TARGET)]), { run: { nonce: n, iterations: 1_000_000, computationMs: 900 } }).features;
    expect(f.eventCount).toBe(2);
  });
});
