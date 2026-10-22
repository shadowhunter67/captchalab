import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  createRng,
  inferModality,
  type InteractionEvent,
  type InteractionSession,
} from "@captchalab/captcha-core";
import {
  TEXT_ALPHABET,
  toTextKeyCode,
  extractTextFeatures,
  generateTextChallenge,
  isCharacterKey,
  normalizeText,
  textPlugin,
  verifyTextAnswer,
  type TextChallenge,
} from "../index";

const challenge: TextChallenge = { id: "c", text: "K7M2QX", glyphs: [], noise: [] };
const T = "text-input";
const down = (t: number, code: string, target = T): InteractionEvent => ({ t, type: "keydown", code, target });
const up = (t: number, code: string): InteractionEvent => ({ t, type: "keyup", code, target: T });
const session = (events: InteractionEvent[]): InteractionSession => ({
  schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "text", startedAt: 0,
  durationMs: events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
});
const f = (events: InteractionEvent[]) => extractTextFeatures(challenge, session(events)).features;

describe("generator", () => {
  it("is deterministic and only uses the unambiguous alphabet", () => {
    expect(generateTextChallenge({ rng: createRng(5) })).toEqual(generateTextChallenge({ rng: createRng(5) }));
    expect(generateTextChallenge({ rng: createRng(6) }).text).not.toBe(generateTextChallenge({ rng: createRng(5) }).text);
    for (let seed = 0; seed < 300; seed++) {
      const c = generateTextChallenge({ rng: createRng(seed) });
      expect(c.text).toHaveLength(6);
      expect([...c.text].every((ch) => TEXT_ALPHABET.includes(ch))).toBe(true);
      expect(c.glyphs.map((g) => g.char).join("")).toBe(c.text);
      expect(c.glyphs.every((g) => Math.abs(g.rotate) <= 18 && Math.abs(g.dy) <= 0.12)).toBe(true);
      expect(c.id).toMatch(/^text-[0-9a-f]{8}$/);
    }
    expect([..."0O1Il"].some((ch) => TEXT_ALPHABET.includes(ch))).toBe(false);
  });
});

describe("verifier", () => {
  it("is case-insensitive and trims surrounding whitespace; anything else fails", () => {
    expect(normalizeText("  k7m2qx ")).toBe("K7M2QX");
    for (const ok of ["K7M2QX", "k7m2qx", "  K7m2Qx\n"]) expect(verifyTextAnswer(challenge, { text: ok }).passed).toBe(true);
    for (const bad of ["", "K7M2Q", "K7M2QXX", "K7 M2QX", "k7m2qy"]) expect(verifyTextAnswer(challenge, { text: bad }).passed).toBe(false);
  });

  it("malformed input fails without throwing, and the reason never echoes what was typed", () => {
    for (const a of [undefined, null, {}, { text: 5 }, { text: null }]) expect(verifyTextAnswer(challenge, a as never).passed).toBe(false);
    for (const c of [undefined, null, {}, { text: "" }, { text: 3 }]) expect(verifyTextAnswer(c as never, { text: "x" }).passed).toBe(false);
    const r = verifyTextAnswer(challenge, { text: "SECRET-TYPED" });
    expect(JSON.stringify(r)).not.toContain("SECRET");
    expect(textPlugin.verify(challenge, { text: "k7m2qx" }, session([]))).toEqual(textPlugin.verify(challenge, { text: "k7m2qx" }, session([down(0, "Letter")])));
  });
});

describe("text features", () => {
  const typeAll = [
    down(300, "Letter"), up(380, "Letter"), down(500, "Digit"), up(560, "Digit"), down(700, "Letter"), down(900, "Digit"), down(1000, "Letter"), down(1100, "Letter"),
  ];

  it("character keys, timing and the inter-key mean", () => {
    const x = f(typeAll);
    expect(x).toMatchObject({
      reactionTime: 300, timeToFirstKey: 300, keyCount: 6, backspaceCount: 0, correctionCount: 0, attemptCount: 1,
      inputModality: "keyboard", completionTime: 1100,
    });
    expect(x.interKeyTimeMean).toBeCloseTo((1100 - 300) / 5);
  });

  it("backspaces after typing are corrections; a leading delete is not", () => {
    const x = f([down(0, "Backspace"), down(100, "Letter"), down(200, "Letter"), down(300, "Backspace"), down(400, "Delete"), down(500, "Letter")]);
    expect(x).toMatchObject({ keyCount: 3, backspaceCount: 3, correctionCount: 2, reactionTime: 0, timeToFirstKey: 100 });
  });

  it("non-character keys (Shift, Enter, Tab) are presses for reaction time only; other targets are ignored", () => {
    const x = f([down(50, "ShiftLeft"), down(120, "Letter"), down(130, "Enter"), down(10, "Letter", "elsewhere")]);
    expect(x).toMatchObject({ reactionTime: 50, timeToFirstKey: 120, keyCount: 1 });
    expect(isCharacterKey("Digit")).toBe(true);
    expect(isCharacterKey("Other")).toBe(true);
    expect(isCharacterKey("KeyK")).toBe(false); // raw codes are never stored; the adapter coarsens them first
    expect(isCharacterKey("ArrowLeft")).toBe(false);
  });

  it("a long pause starts a new typing burst (attempt)", () => {
    expect(f([down(0, "Letter"), down(200, "Letter"), down(9000, "Letter"), down(9100, "Letter")]).attemptCount).toBe(2);
  });

  it("no keys: nulls and zeros", () => {
    expect(f([])).toMatchObject({ reactionTime: null, timeToFirstKey: null, keyCount: 0, backspaceCount: 0, correctionCount: 0, interKeyTimeMean: null, attemptCount: 0, inputModality: "none" });
  });

  it("the stored codes cannot reveal what was typed: letters and digits are coarsened", () => {
    expect(["KeyK", "KeyZ", "Digit7", "Numpad3", "Minus", "Quote", "Semicolon", "IntlBackslash", "Backspace", "Delete", "ShiftLeft", "Enter"].map(toTextKeyCode)).toEqual([
      "Letter", "Letter", "Digit", "Digit", "Other", "Other", "Other", "Other", "Backspace", "Delete", "ShiftLeft", "Enter",
    ]);
    const stored = [..."K7M2QX"].map((ch) => toTextKeyCode(/[0-9]/.test(ch) ? `Digit${ch}` : `Key${ch}`));
    expect(new Set(stored)).toEqual(new Set(["Letter", "Digit"]));
    for (const e of typeAll) expect(Object.keys(e).sort()).toEqual(["code", "t", "target", "type"]);
  });
});

describe("golden: definitions must not change silently", () => {
  it("pins versions and values", () => {
    const set = extractTextFeatures(challenge, session([down(100, "Letter"), down(300, "Letter"), down(500, "Backspace"), down(800, "Digit")]));
    expect(set.schemaVersion).toBe("text@1");
    expect(set.extractorVersion).toBe("text@1");
    expect(set.features).toMatchInlineSnapshot(`
      {
        "attemptCount": 1,
        "backspaceCount": 1,
        "completionTime": 800,
        "correctionCount": 1,
        "eventCount": 4,
        "inputModality": "keyboard",
        "interKeyTimeMean": 350,
        "keyCount": 3,
        "reactionTime": 100,
        "timeToFirstKey": 100,
      }
    `);
  });
});
