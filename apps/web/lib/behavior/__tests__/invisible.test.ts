import { describe, expect, it } from "vitest";
import { isKeyEvent } from "@captchalab/captcha-core";
import { classify } from "../classifier";
import { INVISIBLE_PROFILES, INVISIBLE_TARGETS, analyzeInvisibleSession, escalationFor, generateSyntheticInvisibleSession } from "../invisible";
import { SIGNALS_BY_CAPTCHA } from "../signal-catalog";

const run = (profile: (typeof INVISIBLE_PROFILES)[number], seed = 1) => {
  const { session, meta } = generateSyntheticInvisibleSession(profile, seed);
  const vector = analyzeInvisibleSession(session);
  return { session, meta, vector, classification: classify(vector) };
};

describe("invisible task", () => {
  it("is deterministic and records one click per target", () => {
    for (const p of INVISIBLE_PROFILES) {
      expect(run(p, 3).session).toEqual(run(p, 3).session);
      const { vector } = run(p, 3);
      expect(vector.captchaId).toBe("invisible");
      expect(vector.values["attemptCount"]).toBe(INVISIBLE_TARGETS.length);
      expect(vector.values["corrections"]).toBe(0);
      expect(Object.keys(vector.values).sort()).toEqual([...SIGNALS_BY_CAPTCHA.invisible].sort());
    }
  });

  it("carries the generator version and seed", () => {
    expect(run("mixed", 5).meta).toEqual({ profile: "mixed", generator: "synthetic@1", seed: 5 });
  });

  it("regular and eased movement read synthetic-like; variable reads human-like; mixed can be uncertain", () => {
    expect(run("regular").classification.label).toBe("synthetic-like");
    expect(run("eased").classification.label).toBe("synthetic-like");
    expect(run("variable").classification.label).toBe("human-like");
    expect(run("mixed", 1).classification.label).toBe("uncertain");
  });

  it("counts missed clicks as corrections and keyboard activations as clicks", () => {
    const { session } = generateSyntheticInvisibleSession("regular");
    const miss = [
      { t: 10, type: "pointerdown" as const, x: 5, y: 5, pointerId: 1, pointerType: "mouse" as const, target: "inv-pad" },
      { t: 20, type: "pointerup" as const, x: 5, y: 5, pointerId: 1, pointerType: "mouse" as const, target: "inv-pad" },
    ];
    const missed = { ...session, events: [...miss, ...session.events.map((e) => ({ ...e, t: e.t + 100 }))] };
    expect(analyzeInvisibleSession(missed).values["corrections"]).toBe(1);

    const keyboard = {
      ...session,
      inputModality: "keyboard" as const,
      events: [200, 900, 1500].flatMap((t) => [
        { t, type: "keydown" as const, code: "Enter", target: "inv-target" },
        { t: t + 40, type: "keyup" as const, code: "Enter", target: "inv-target" },
      ]),
    };
    const v = analyzeInvisibleSession(keyboard);
    expect(v.values["attemptCount"]).toBe(3);
    // No pointer at all: the motion signals are absent, not zero.
    expect(v.values["speedCv"]).toBeNull();
    expect(v.values["pointerDistance"]).toBeNull();
    expect(keyboard.events.every(isKeyEvent)).toBe(true);
    expect(classify(v).evaluated).toBeLessThan(5);
  });
});

describe("escalation suggestion", () => {
  it("maps each label to a simulated suggestion", () => {
    expect(escalationFor("human-like")).toMatchObject({ key: "none", href: null, en: "No extra challenge selected." });
    expect(escalationFor("uncertain")).toMatchObject({ key: "checkbox", href: "/playground/checkbox" });
    expect(escalationFor("synthetic-like")).toMatchObject({ key: "slider", href: "/playground/slider" });
  });

  it("only suggests: no enforcement wording", () => {
    for (const label of ["human-like", "uncertain", "synthetic-like"] as const) {
      const e = escalationFor(label);
      expect(`${e.en} ${e.vi}`).not.toMatch(/denied|blocked|forbidden|từ chối|chặn/i);
    }
  });
});
