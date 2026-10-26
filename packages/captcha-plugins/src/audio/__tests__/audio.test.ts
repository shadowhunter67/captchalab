import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createRng, inferModality, type CaptchaDifficulty, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import {
  AUDIO_PLAY_TARGET,
  AUDIO_TARGET,
  AUDIO_VARIANTS,
  audioPlugin,
  clipPath,
  extractAudioFeatures,
  generateAudioChallenge,
  verifyAudioAnswer,
} from "../index";

const gen = (seed: number, variantId?: string, difficulty?: CaptchaDifficulty) => generateAudioChallenge({ rng: createRng(seed), variantId, difficulty });
const LEVELS = ["easy", "medium", "hard"] as const;

describe("generator", () => {
  it("is deterministic and follows the preset for both variants and every level", () => {
    for (const v of AUDIO_VARIANTS.variants) {
      for (const d of LEVELS) {
        const p = v.difficulties[d]!;
        for (let seed = 0; seed < 40; seed++) {
          const c = gen(seed, v.id, d);
          expect(c).toEqual(gen(seed, v.id, d));
          expect(c.digits).toMatch(new RegExp(`^\\d{${p.digits}}$`));
          expect(c.gapMs).toBe(p.gapMs);
          expect(c.noiseLevel).toBe(p.noiseLevel);
          expect(Number.isInteger(c.noiseSeed)).toBe(true);
          expect(c.config).toMatchObject({ variantId: v.id, difficulty: d });
        }
      }
    }
  });
  it("harder levels: more digits, shorter gaps; noise never gets loud and gaps never drop below 240 ms", () => {
    for (const v of AUDIO_VARIANTS.variants) {
      const [e, m, h] = LEVELS.map((d) => v.difficulties[d]!) as [NonNullable<(typeof v.difficulties)["easy"]>, NonNullable<(typeof v.difficulties)["easy"]>, NonNullable<(typeof v.difficulties)["easy"]>];
      expect(e.digits).toBeLessThan(m.digits);
      expect(m.digits).toBeLessThan(h.digits);
      expect(e.gapMs).toBeGreaterThan(h.gapMs);
      for (const p of [e, m, h]) {
        expect(p.gapMs).toBeGreaterThanOrEqual(240);
        expect(p.noiseLevel).toBeLessThanOrEqual(0.12);
      }
    }
    expect(gen(1, "spoken-digits", "easy").noiseLevel).toBe(0);
  });
  it("every digit has a local clip path under the audio folder (relative, no host)", () => {
    for (let d = 0; d < 10; d++) expect(clipPath(String(d))).toBe(`audio/digits/${d}.wav`);
    for (const c of Array.from({ length: 30 }, (_, s) => gen(s))) for (const ch of c.digits) expect(clipPath(ch)).toMatch(/^audio\/digits\/\d\.wav$/);
  });
});

describe("verifier", () => {
  const c = gen(5, "spoken-digits", "medium");
  it("accepts exactly the digits (surrounding whitespace allowed)", () => {
    expect(verifyAudioAnswer(c, { value: c.digits }).passed).toBe(true);
    expect(verifyAudioAnswer(c, { value: ` ${c.digits} ` }).passed).toBe(true);
  });
  it("rejects wrong digits, spaces inside, extra characters and garbage", () => {
    const wrong = c.digits.slice(0, -1) + String((Number(c.digits.at(-1)) + 1) % 10);
    expect(verifyAudioAnswer(c, { value: wrong })).toMatchObject({ passed: false, reason: "The digits do not match what was played." });
    for (const bad of [c.digits.split("").join(" "), `${c.digits}x`, c.digits.slice(1), `${c.digits}0`, "", "abc"]) expect(verifyAudioAnswer(c, { value: bad }).passed).toBe(false);
    expect(verifyAudioAnswer(c, { value: "abc" }).reason).toBe("The answer must be digits only.");
  });
  it("never throws on malformed input and never repeats what was typed or the digits", () => {
    for (const a of [undefined, null, {}, { value: 5 }, { value: null }, 7]) expect(verifyAudioAnswer(c, a as never).passed).toBe(false);
    for (const ch of [undefined, null, {}, { ...c, digits: "ab" }, { ...c, digits: 123456 }, { ...c, digits: "12" }]) expect(verifyAudioAnswer(ch as never, { value: c.digits }).passed).toBe(false);
    expect(JSON.stringify(verifyAudioAnswer(c, { value: "99999" }))).not.toContain("99999");
    expect(JSON.stringify(verifyAudioAnswer(c, { value: c.digits }))).not.toContain(c.digits);
  });
  it("ignores the interaction", () => {
    const empty: InteractionSession = { schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "audio", startedAt: 0, durationMs: 0, events: [], inputModality: "none" };
    expect(audioPlugin.verify(c, { value: c.digits }, empty).passed).toBe(true);
  });
});

describe("features", () => {
  const c = gen(5, "spoken-digits", "easy");
  const press = (t: number): InteractionEvent[] => [
    { t, type: "pointerdown", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: AUDIO_PLAY_TARGET },
    { t: t + 10, type: "pointerup", x: 1, y: 1, pointerId: 1, pointerType: "mouse", target: AUDIO_PLAY_TARGET },
  ];
  const key = (t: number, code: string): InteractionEvent => ({ t, type: "keydown", code, target: AUDIO_TARGET });
  const session = (events: InteractionEvent[], durationMs?: number): InteractionSession => ({
    schemaVersion: SCHEMA_VERSION, id: "s", captchaId: "audio", startedAt: 0, durationMs: durationMs ?? events.at(-1)?.t ?? 0, events, inputModality: inferModality(events),
  });
  const f = (events: InteractionEvent[], durationMs?: number) => extractAudioFeatures(c, session(events, durationMs)).features;

  it("counts plays and typing, and the time from the last play to the end", () => {
    const r = f([...press(200), ...press(5000), key(6000, "Digit"), key(6300, "Digit"), key(6600, "Backspace"), key(6900, "Digit")], 8000);
    expect(r).toMatchObject({ reactionTime: 200, timeToFirstPlay: 210, playCount: 2, timeToFirstKey: 6000, keyCount: 3, backspaceCount: 1, correctionCount: 1, attemptCount: 1, timeFromLastPlayToEnd: 8000 - 5010 });
  });
  it("Space and Enter on the Play button count as plays; other keys and targets do not", () => {
    const playKey = (t: number, code: string): InteractionEvent => ({ t, type: "keydown", code, target: AUDIO_PLAY_TARGET });
    const r = f([playKey(10, "Space"), playKey(20, "Enter"), playKey(30, "KeyA"), { t: 40, type: "keydown", code: "Space", target: "text-input" }]);
    expect(r.playCount).toBe(2);
    expect(r.inputModality).toBe("keyboard");
  });
  it("typing before ever playing gives no play times", () => {
    expect(f([key(100, "Digit")], 500)).toMatchObject({ reactionTime: 100, timeToFirstPlay: null, playCount: 0, timeFromLastPlayToEnd: null });
  });
  it("empty session", () => {
    expect(f([])).toMatchObject({ reactionTime: null, playCount: 0, keyCount: 0, attemptCount: 0 });
  });
});
