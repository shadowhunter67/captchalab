import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  MATH_LOGIC_VARIANTS,
  MATH_TARGET,
  evalExpr,
  extractMathLogicFeatures,
  formatExpr,
  generateMathChallenge,
  mathLogicPlugin,
  num,
  op,
  operatorsIn,
  parseStrictInteger,
  verifyMathAnswer,
  type MathChallenge,
} from "../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) =>
  generateMathChallenge({ rng: createRng(seed), variantId, difficulty });

describe("expressions", () => {
  it("evaluates with the usual precedence", () => {
    expect(evalExpr(op("+", num(2), op("*", num(3), num(4))))).toBe(14);
    expect(evalExpr(op("*", op("+", num(7), num(5)), num(2)))).toBe(24);
    expect(evalExpr(op("-", num(10), op("-", num(4), num(1))))).toBe(7);
  });
  it("rejects malformed trees and does not throw", () => {
    for (const bad of [null, undefined, 5, {}, { kind: "num", value: 1.5 }, { kind: "op", op: "/", left: num(1), right: num(2) }, { kind: "num", value: "7" }]) {
      expect(evalExpr(bad as never)).toBeNull();
    }
    let deep = num(1);
    for (let i = 0; i < 10; i++) deep = op("+", deep, num(1));
    expect(evalExpr(deep)).toBeNull();
  });
  it("shows only the parentheses that are needed", () => {
    expect(formatExpr(op("+", op("*", num(2), num(3)), num(4)))).toBe("2 × 3 + 4");
    expect(formatExpr(op("*", op("+", num(7), num(5)), num(2)))).toBe("(7 + 5) × 2");
    expect(formatExpr(op("-", num(10), op("-", num(4), num(1))))).toBe("10 − (4 − 1)");
    expect(formatExpr(op("-", num(5), num(2)), { minus: "-" })).toBe("5 - 2");
  });
  it("lists the operators used", () => {
    expect(operatorsIn(op("+", op("*", num(2), num(3)), num(4)))).toEqual(["+", "*"]);
  });
});

describe("generator", () => {
  it("is deterministic, records its config, and every challenge agrees with its own tree", () => {
    for (const v of MATH_LOGIC_VARIANTS.variants) {
      for (const d of ["easy", "medium", "hard"] as const) {
        for (let seed = 0; seed < 60; seed++) {
          const c = gen(seed, v.id, d);
          expect(c).toEqual(gen(seed, v.id, d));
          expect(c.config).toMatchObject({ variantId: v.id, difficulty: d });
          expect(verifyMathAnswer(c, { value: String(c.expectedAnswer) }).passed).toBe(true);
          expect(verifyMathAnswer(c, { value: String(c.expectedAnswer + 1) }).passed).toBe(false);
          if (c.kind === "comparison") expect(evalExpr(c.expr)).not.toBe(evalExpr(c.other!));
          expect(Number.isInteger(c.expectedAnswer)).toBe(true);
        }
      }
    }
  });
  it("arithmetic difficulty: easy has only + and -, medium can multiply, hard has two steps with correct precedence", () => {
    for (let seed = 0; seed < 80; seed++) {
      const easy = gen(seed, "arithmetic", "easy");
      expect(operatorsIn(easy.expr).every((o) => o !== "*")).toBe(true);
      expect(easy.expectedAnswer).toBeGreaterThanOrEqual(0);
      const hard = gen(seed, "arithmetic", "hard");
      expect(operatorsIn(hard.expr).length).toBeGreaterThanOrEqual(2);
      expect(hard.expr.kind === "op" && (hard.expr.left.kind === "op" || hard.expr.right.kind === "op")).toBe(true);
      expect(hard.expectedAnswer).toBeGreaterThan(0);
    }
    const kinds = new Set<string>();
    for (let seed = 0; seed < 80; seed++) for (const o of operatorsIn(gen(seed, "arithmetic", "medium").expr)) kinds.add(o);
    expect(kinds.has("*")).toBe(true);
  });
  it("comparison: harder levels are closer; hard compares expressions", () => {
    const gap = (c: MathChallenge) => Math.abs((evalExpr(c.expr) ?? 0) - (evalExpr(c.other!) ?? 0));
    for (let seed = 0; seed < 60; seed++) {
      expect(gap(gen(seed, "comparison", "easy"))).toBeGreaterThanOrEqual(10);
      expect(gap(gen(seed, "comparison", "medium"))).toBeLessThanOrEqual(5);
      const hard = gen(seed, "comparison", "hard");
      expect(hard.expr.kind).toBe("op");
      expect(gap(hard)).toBeLessThanOrEqual(10);
    }
  });
});

describe("strict parsing and verification", () => {
  const c = { ...gen(1, "arithmetic", "easy") };
  const right = String(c.expectedAnswer);
  it("accepts only an optional minus and digits", () => {
    expect(parseStrictInteger(" 12 ")).toBe(12);
    expect(parseStrictInteger("-3")).toBe(-3);
    for (const bad of ["12abc", "1 2", "+5", "1e3", "", " ", "1.5", "0x10", "--1", "1234567890", "١٢"]) expect(parseStrictInteger(bad)).toBeNull();
  });
  it("passes the right answer and fails garbage around it", () => {
    expect(verifyMathAnswer(c, { value: right }).passed).toBe(true);
    expect(verifyMathAnswer(c, { value: ` ${right} ` }).passed).toBe(true);
    for (const bad of [`${right}abc`, `${right}.0`, `+${right}`, `${right}e0`, "", "abc"]) expect(verifyMathAnswer(c, { value: bad }).passed).toBe(false);
  });
  it("never throws on malformed input and never repeats what was typed", () => {
    for (const a of [undefined, null, {}, { value: 5 }, { value: null }, 7]) expect(verifyMathAnswer(c, a as never).passed).toBe(false);
    for (const ch of [undefined, null, {}, { ...c, expectedAnswer: c.expectedAnswer + 1 }, { ...c, kind: "other" }, { ...c, kind: "comparison" }]) {
      expect(verifyMathAnswer(ch as never, { value: right }).passed).toBe(false);
    }
    expect(JSON.stringify(verifyMathAnswer(c, { value: "SECRET-77" }))).not.toContain("SECRET");
  });
  it("a comparison with a tie has no single answer and fails", () => {
    const tie: MathChallenge = { id: "x", kind: "comparison", expr: num(5), other: num(5), expectedAnswer: 5 };
    expect(verifyMathAnswer(tie, { value: "5" }).passed).toBe(false);
  });
  it("ignores the interaction", () => {
    const empty: InteractionSession = { schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "math-logic", startedAt: 0, durationMs: 0, events: [], inputModality: "none" };
    expect(mathLogicPlugin.verify(c, { value: right }, empty).passed).toBe(true);
  });
  it("the source never uses eval or Function", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["expr.ts", "generator.ts", "verifier.ts"]) {
      const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(text).not.toMatch(/\beval\s*\(|new Function|\bFunction\s*\(/);
    }
  });
});

describe("features", () => {
  const c = gen(1, "arithmetic", "easy");
  const key = (t: number, code: string): InteractionEvent => ({ t, type: "keydown", code, target: MATH_TARGET });
  const session = (events: InteractionEvent[]): InteractionSession => ({
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "math-logic", startedAt: 0, durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  });
  const f = (events: InteractionEvent[]) => extractMathLogicFeatures(c, session(events)).features;

  it("empty session", () => {
    expect(f([])).toMatchObject({ reactionTime: null, timeToFirstKey: null, keyCount: 0, backspaceCount: 0, correctionCount: 0, interKeyTimeMean: null, attemptCount: 0 });
  });
  it("counts digits, backspaces, corrections and bursts", () => {
    const r = f([key(100, "Digit"), key(300, "Digit"), key(500, "Backspace"), key(700, "Digit"), key(6000, "Digit")]);
    expect(r).toMatchObject({ reactionTime: 100, timeToFirstKey: 100, keyCount: 4, backspaceCount: 1, correctionCount: 1, attemptCount: 2, inputModality: "keyboard" });
    expect(r.interKeyTimeMean).toBeCloseTo((200 + 400 + 5300) / 3);
  });
  it("a leading delete is not a correction; other targets are ignored", () => {
    const other: InteractionEvent = { t: 5, type: "keydown", code: "Digit", target: "text-input" };
    expect(f([key(10, "Backspace"), key(20, "Digit"), other]).correctionCount).toBe(0);
    expect(f([other]).keyCount).toBe(0);
  });
});
