import { describe, expect, it } from "vitest";
import { isKeyEvent, isPointerEvent } from "@captchalab/captcha-core";
import {
  buildAnswer,
  deriveDragAttempts,
  deriveRotation,
  extractToggles,
  registry,
  type DragDropChallenge,
  type ImageGridChallenge,
  type RotationChallenge,
  type TextChallenge,
} from "@captchalab/captcha-plugins";
import { DEFAULT_DRAG_LAYOUT, DEFAULT_ROTATION_CENTER } from "../analysis";
import { PROFILES_BY_CAPTCHA, defaultContext, generateSyntheticSample, generateSyntheticSession } from "../synthetic";
import { BEHAVIOR_CAPTCHAS, challengeFor } from "./helpers";

const SEEDS = [1, 2, 3, 7, 11, 42];

describe.each(BEHAVIOR_CAPTCHAS)("synthetic %s", (id) => {
  it.each(PROFILES_BY_CAPTCHA[id].map((p) => p.id))("%s: deterministic for the same challenge, profile and seed", (profile) => {
    for (const challengeSeed of SEEDS) {
      const challenge = challengeFor(id, challengeSeed);
      const a = generateSyntheticSession({ captchaId: id, profile, challenge, seed: 5 });
      expect(generateSyntheticSession({ captchaId: id, profile, challenge, seed: 5 })).toEqual(a);
    }
  });

  it.each(PROFILES_BY_CAPTCHA[id].map((p) => p.id))("%s: a valid normalized session (ordered times, known event shape)", (profile) => {
    for (const challengeSeed of SEEDS) {
      const s = generateSyntheticSession({ captchaId: id, profile, challenge: challengeFor(id, challengeSeed), seed: 3 });
      expect(s.captchaId).toBe(id);
      expect(s.events.length).toBeGreaterThan(0);
      expect(s.durationMs).toBeGreaterThanOrEqual(s.events.at(-1)!.t);
      for (let i = 0; i < s.events.length; i++) {
        const e = s.events[i]!;
        expect(Number.isFinite(e.t)).toBe(true);
        if (i > 0) expect(e.t).toBeGreaterThanOrEqual(s.events[i - 1]!.t);
        if (isPointerEvent(e)) {
          expect(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.pointerId)).toBe(true);
          expect(e.pointerType).toBe("mouse");
        } else {
          expect(isKeyEvent(e)).toBe(true);
        }
      }
      expect(["mouse", "keyboard", "mixed"]).toContain(s.inputModality);
    }
  });

  it("the random profiles change with the synthetic seed; the others ignore it", () => {
    const challenge = challengeFor(id, 7);
    for (const p of PROFILES_BY_CAPTCHA[id]) {
      const a = generateSyntheticSession({ captchaId: id, profile: p.id, challenge, seed: 1 });
      const b = generateSyntheticSession({ captchaId: id, profile: p.id, challenge, seed: 2 });
      if (p.random) expect(b).not.toEqual(a);
      else expect(b).toEqual(a);
    }
  });

  it("rejects a profile this CAPTCHA does not have", () => {
    expect(() => generateSyntheticSession({ captchaId: id, profile: "no-such-profile", challenge: challengeFor(id), seed: 1 })).toThrow(RangeError);
  });

  it("the vector holds derived numbers only and the version references", () => {
    const challenge = challengeFor(id, 7);
    for (const p of PROFILES_BY_CAPTCHA[id]) {
      const sample = generateSyntheticSample({ captchaId: id, profile: p.id, challenge, seed: 1 });
      expect(sample.synthetic).toEqual({ profile: p.id, generator: "synthetic@1", seed: 1 });
      expect(sample.vector.featureSetVersion).toBe("behavior-signals@1");
      expect(sample.vector.sourceSchema.startsWith(`${id}@1`)).toBe(true);
      for (const v of Object.values(sample.vector.values)) expect(v === null || (typeof v === "number" && Number.isFinite(v))).toBe(true);
      expect(Object.keys(sample.vector).sort()).toEqual(["captchaId", "featureSetVersion", "inputModality", "sourceSchema", "values"]);
    }
  });
});

// The synthetic side is a real, completed attempt on the lab's challenge: it must pass that challenge's own verifier.
describe("synthetic sessions complete the challenge they are made for", () => {
  it("drag & drop: every item ends on its own target", () => {
    for (const profile of ["direct", "eased", "noisy"]) {
      for (const cs of SEEDS) {
        const challenge = challengeFor("drag-drop", cs) as DragDropChallenge;
        const session = generateSyntheticSession({ captchaId: "drag-drop", profile, challenge, seed: 4 });
        const { finalState, attempts } = deriveDragAttempts(challenge, DEFAULT_DRAG_LAYOUT, session);
        expect(attempts).toHaveLength(challenge.items.length);
        expect(registry.get("drag-drop").verify(challenge, buildAnswer(challenge, finalState), session).passed).toBe(true);
      }
    }
  });

  it("image grid: exactly the matching tiles are selected at the end", () => {
    for (const profile of ["immediate", "uniform-interval", "variable-interval"]) {
      for (const cs of SEEDS) {
        const challenge = challengeFor("image-grid", cs) as ImageGridChallenge;
        const session = generateSyntheticSession({ captchaId: "image-grid", profile, challenge, seed: 4 });
        const selected = new Set<string>();
        for (const t of extractToggles(session)) {
          if (t.selected) selected.add(t.cellId);
          else selected.delete(t.cellId);
        }
        expect(registry.get("image-grid").verify(challenge, { selected: [...selected] }, session).passed).toBe(true);
      }
    }
  });

  it("rotation: ends within the tolerance, including when the short way round crosses 0/360", () => {
    for (const profile of ["direct", "eased", "overshoot-correct"]) {
      for (let cs = 1; cs <= 40; cs++) {
        const challenge = challengeFor("rotation", cs) as RotationChallenge;
        const session = generateSyntheticSession({ captchaId: "rotation", profile, challenge, seed: 4 });
        const { finalAngle } = deriveRotation(challenge, { center: DEFAULT_ROTATION_CENTER }, session);
        expect(registry.get("rotation").verify(challenge, { angle: finalAngle }, session).passed).toBe(true);
      }
    }
  });

  it("checkbox: an odd number of completed activations leaves it checked", () => {
    for (const p of PROFILES_BY_CAPTCHA.checkbox) {
      const sample = generateSyntheticSample({ captchaId: "checkbox", profile: p.id, challenge: challengeFor("checkbox"), seed: 1 });
      expect((sample.vector.values["activationCount"] as number) % 2).toBe(1);
    }
  });

  it("text: types the answer's length in character keys and records only coarse key codes", () => {
    for (const profile of ["uniform-typing", "variable-typing", "correction-typing"]) {
      for (const cs of SEEDS) {
        const challenge = challengeFor("text", cs) as TextChallenge;
        const sample = generateSyntheticSample({ captchaId: "text", profile, challenge, seed: 6 });
        const chars = challenge.text.length + (profile === "correction-typing" ? 1 : 0);
        expect(sample.vector.values["activationCount"]).toBe(chars);
        expect(sample.vector.values["corrections"]).toBe(profile === "correction-typing" ? 1 : 0);
        const codes = new Set(sample.session.events.filter(isKeyEvent).map((e) => e.code));
        for (const c of codes) expect(["Letter", "Digit", "Backspace", "Enter"]).toContain(c);
        // The typed text cannot be recovered from the session or the vector.
        expect(JSON.stringify(sample.session)).not.toContain(challenge.text);
        expect(JSON.stringify(sample.vector)).not.toContain(challenge.text);
      }
    }
  });
});

describe("profiles differ in what they are meant to show", () => {
  const sample = (captchaId: (typeof BEHAVIOR_CAPTCHAS)[number], profile: string, seed = 7) =>
    generateSyntheticSample({ captchaId, profile, challenge: challengeFor(captchaId, seed), seed: 1 }).vector.values;

  it("slider stop-and-correct pauses and corrects; linear never does", () => {
    const stop = sample("slider", "stop-and-correct");
    const linear = sample("slider", "linear");
    expect(stop["corrections"]).toBeGreaterThanOrEqual(1);
    expect(stop["overshoot"]).toBeGreaterThan(0);
    expect(linear["corrections"]).toBe(0);
    expect(linear["speedCv"] as number).toBeLessThan(0.05);
  });

  it("uniform profiles have (almost) no rhythm variation, variable ones do", () => {
    expect(sample("text", "uniform-typing")["interKeyCv"]).toBe(0);
    expect(sample("text", "variable-typing")["interKeyCv"] as number).toBeGreaterThan(0.05);
    expect(sample("checkbox", "regular-timing")["interClickCv"]).toBe(0);
    expect(sample("drag-drop", "direct")["dragDurationCv"]).toBe(0);
    expect(sample("drag-drop", "noisy")["dragDurationCv"] as number).toBeGreaterThan(0);
    // A grid with at least three matching tiles, so there are two gaps to compare.
    const seed = Array.from({ length: 60 }, (_, i) => i + 1).find((s) => {
      const c = challengeFor("image-grid", s) as ImageGridChallenge;
      return c.cells.filter((x) => x.shape === c.target).length >= 3;
    })!;
    const grid = (profile: string) => generateSyntheticSample({ captchaId: "image-grid", profile, challenge: challengeFor("image-grid", seed), seed: 1 }).vector.values;
    expect(grid("uniform-interval")["interClickCv"]).toBe(0);
    expect(grid("variable-interval")["interClickCv"] as number).toBeGreaterThan(0.05);
  });

  it("drag & drop direct lands on the centre; noisy lands off-centre", () => {
    expect(sample("drag-drop", "direct")["releaseError"] as number).toBeLessThan(1);
    expect(sample("drag-drop", "noisy")["releaseError"] as number).toBeGreaterThan(1);
  });

  it("rotation overshoot-and-correct reverses direction once; direct never does", () => {
    for (let cs = 1; cs <= 10; cs++) {
      expect(sample("rotation", "direct", cs)["corrections"]).toBe(0);
      expect(sample("rotation", "overshoot-correct", cs)["corrections"]).toBe(1);
    }
  });

  it("the default context of each CAPTCHA is only what its extractor needs", () => {
    expect(defaultContext("checkbox")).toBeUndefined();
    expect(defaultContext("text")).toBeUndefined();
    expect(defaultContext("image-grid")).toBeUndefined();
    expect(defaultContext("rotation")).toEqual({ center: DEFAULT_ROTATION_CENTER });
  });
});
