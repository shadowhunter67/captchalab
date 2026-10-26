import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { num, op, type MathLogicFeatures } from "@captchalab/captcha-plugins";
import { mathMetrics, speakExpr } from "../math-view-data";

const VI = (vi: string, _en: string): string => vi;
const features = {
  reactionTime: 300,
  timeToFirstKey: 400,
  completionTime: 2000,
  keyCount: 2,
  backspaceCount: 0,
  correctionCount: 0,
  interKeyTimeMean: null,
  attemptCount: 1,
  eventCount: 8,
  inputModality: "keyboard",
} as unknown as MathLogicFeatures;

describe("speakExpr", () => {
  it("speaks a single operation", () => {
    expect(speakExpr(op("+", num(7), num(5)))).toBe("7 plus 5");
    expect(speakExpr(op("-", num(7), num(5)))).toBe("7 minus 5");
    expect(speakExpr(op("*", num(7), num(5)))).toBe("7 times 5");
  });
  it("speaks brackets only where precedence needs them", () => {
    expect(speakExpr(op("*", op("+", num(7), num(5)), num(2)))).toBe("open bracket 7 plus 5 close bracket times 2");
    expect(speakExpr(op("+", num(7), op("*", num(5), num(2))))).toBe("7 plus 5 times 2");
  });
  it("brackets a subtraction on the right of a subtraction", () => {
    expect(speakExpr(op("-", num(9), op("-", num(4), num(1))))).toBe("9 minus open bracket 4 minus 1 close bracket");
    expect(speakExpr(op("-", op("-", num(9), num(4)), num(1)))).toBe("9 minus 4 minus 1");
  });
  it("speaks Vietnamese", () => {
    expect(speakExpr(op("*", op("+", num(7), num(5)), num(2)), VI)).toBe("mở ngoặc 7 cộng 5 đóng ngoặc nhân 2");
    expect(speakExpr(op("-", num(7), num(5)), VI)).toBe("7 trừ 5");
  });
  it("speaks a lone number", () => {
    expect(speakExpr(num(42))).toBe("42");
  });
});

describe("mathMetrics", () => {
  it("has the expected ids in order", () => {
    expect(mathMetrics(features).map((m) => m.id)).toEqual([
      "reactionTime",
      "timeToFirstKey",
      "completionTime",
      "keyCount",
      "backspaceCount",
      "correctionCount",
      "interKeyTimeMean",
      "attemptCount",
      "eventCount",
      "inputModality",
    ]);
  });
  it("keeps null as null (shown as a dash, never 0)", () => {
    expect(mathMetrics(features).find((x) => x.id === "interKeyTimeMean")).toMatchObject({ value: null });
  });
  it("translates labels", () => {
    expect(mathMetrics(features, VI)[3]?.label).toBe("Phím ký tự");
    expect(mathMetrics(features)[3]?.label).toBe("Character keys");
  });
});

describe("no dynamic code", () => {
  it.each(["math-view-data.ts", "MathSession.tsx"])("%s has no eval or Function constructor", (file) => {
    const text = readFileSync(join(__dirname, "..", file), "utf8");
    expect(text).not.toMatch(/\beval\s*\(/);
    expect(text).not.toMatch(/new\s+Function/);
  });
});
