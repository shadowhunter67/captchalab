import { describe, expect, it } from "vitest";
import { isKeyEvent } from "@captchalab/captcha-core";
import {
  EMPTY_MATCH_STATE,
  EMPTY_RECALL,
  applyActivation,
  applyRecall,
  answerFromState,
  extractMatchActivations,
  extractMemoryActivations,
  extractOptionActivations,
  memoryAnswer,
  registry,
  type MathChallenge,
  type MemoryChallenge,
  type SequenceChallenge,
  type ShapeMatchingChallenge,
} from "@captchalab/captcha-plugins";
import { analyzeSession } from "../analysis";
import { RULES_BY_CAPTCHA } from "../rules";
import { PROFILES_BY_CAPTCHA, defaultContext, generateSyntheticSample, generateSyntheticSession } from "../synthetic";
import { V05_CAPTCHAS } from "../types";
import { canonicalJson, integrityOf } from "@/lib/research/safe";
import { challengeFor } from "./helpers";

const SEEDS = [1, 2, 3, 7, 11, 42];

describe("rules of the six v0.5 CAPTCHAs are frozen", () => {
  it("their classifier rules are exactly as released (any change must bump the classifier version)", () => {
    const frozen = Object.fromEntries(V05_CAPTCHAS.map((id) => [id, RULES_BY_CAPTCHA[id]]));
    expect(integrityOf(frozen)).toBe("968990f774ee8ed5a7f6f62dc305c7b0fecbe14ff97c90367498bb0badc7bdd5");
    expect(canonicalJson(frozen).length).toBeGreaterThan(1000);
  });
});

describe("synthetic sessions complete the five CAPTCHAs added in v0.7", () => {
  it("shape matching: the final matching is the right one", () => {
    for (const profile of ["immediate", "uniform-interval", "variable-interval"]) {
      for (const cs of SEEDS.flatMap((x) => [x, -x])) {
        const challenge = challengeFor("shape-matching", Math.abs(cs), cs > 0 ? "exact" : "pattern") as ShapeMatchingChallenge;
        const session = generateSyntheticSession({ captchaId: "shape-matching", profile, challenge, seed: 3 });
        let state = EMPTY_MATCH_STATE;
        for (const a of extractMatchActivations(session)) state = applyActivation(state, a, challenge).state;
        expect(registry.get("shape-matching").verify(challenge, { matches: answerFromState(challenge, state) }, session).passed).toBe(true);
      }
    }
  });

  it("memory: recall is completed, and recall starts after the preview in its own context", () => {
    for (const profile of ["immediate", "uniform-interval", "variable-interval"]) {
      for (const cs of SEEDS.flatMap((x) => [x, -x])) {
        const challenge = challengeFor("memory", Math.abs(cs), cs > 0 ? "sequence" : "position") as MemoryChallenge;
        const sample = generateSyntheticSample({ captchaId: "memory", profile, challenge, seed: 3 });
        const recallStart = (sample.context as { recallStartMs: number }).recallStartMs;
        expect(recallStart).toBeGreaterThan(challenge.previewMs);
        let state = EMPTY_RECALL;
        for (const a of extractMemoryActivations(sample.session)) {
          expect(a.act.kind === "start" || a.t >= recallStart).toBe(true);
          state = applyRecall(state, a.act, challenge).state;
        }
        expect(registry.get("memory").verify(challenge, memoryAnswer(challenge, state), sample.session).passed).toBe(true);
        expect(sample.vector.values["activationCount"]).toBeGreaterThan(0);
      }
    }
  });

  it("memory: a human context is never used to measure a synthetic session", () => {
    const challenge = challengeFor("memory", 7);
    const a = generateSyntheticSample({ captchaId: "memory", profile: "uniform-interval", challenge, seed: 1, context: { recallStartMs: 99999 } });
    const b = generateSyntheticSample({ captchaId: "memory", profile: "uniform-interval", challenge, seed: 1 });
    expect(a.context).toEqual(b.context);
    expect(a.vector).toEqual(b.vector);
    expect(defaultContext("memory")).toEqual({ recallStartMs: null });
  });

  it("sequence (both variants): the typed or chosen answer is the right one", () => {
    let seen = new Set<string>();
    for (const cs of Array.from({ length: 40 }, (_, i) => i + 1)) {
      for (const profile of ["immediate", "uniform-timing", "variable-timing"]) {
        const challenge = challengeFor("sequence", cs, cs % 2 === 0 ? "number" : "visual") as SequenceChallenge;
        seen = seen.add(challenge.kind);
        const session = generateSyntheticSession({ captchaId: "sequence", profile, challenge, seed: 3 });
        if (challenge.kind === "visual") {
          let chosen: string | null = null;
          for (const a of extractOptionActivations(session)) chosen = a.id === chosen ? null : a.id;
          expect(chosen).toBe(challenge.expectedOptionId);
          expect(registry.get("sequence").verify(challenge, { kind: "option", optionId: chosen as string }, session).passed).toBe(true);
        } else {
          const chars = session.events.filter((e) => isKeyEvent(e) && e.type === "keydown" && e.code !== "Enter" && e.code !== "Backspace");
          expect(chars.length).toBe(String(challenge.expectedAnswer).length);
        }
      }
    }
    expect([...seen].sort()).toEqual(["number", "visual"]);
  });

  it("math and audio: the answer's length in character keys, coarse key classes only", () => {
    for (const id of ["math-logic", "audio"] as const) {
      for (const profile of ["uniform-typing", "variable-typing", "correction-typing"]) {
        for (const cs of SEEDS) {
          const variant = id === "math-logic" ? (cs % 2 ? "arithmetic" : "comparison") : cs % 2 ? "spoken-digits" : "noisy-digits";
          const challenge = challengeFor(id, cs, variant) as { expectedAnswer?: number; digits?: string };
          const answer = String(challenge.expectedAnswer ?? challenge.digits);
          const sample = generateSyntheticSample({ captchaId: id, profile, challenge, seed: 6 });
          expect(sample.vector.values["activationCount"]).toBe(answer.length + (profile === "correction-typing" ? 1 : 0));
          expect(sample.vector.values["corrections"]).toBe(profile === "correction-typing" ? 1 : 0);
          for (const e of sample.session.events.filter(isKeyEvent)) expect(["Digit", "Other", "Letter", "Backspace", "Enter"]).toContain(e.code);
        }
      }
    }
  });

  it("audio plays before the answer is typed, and the variable profiles replay", () => {
    const challenge = challengeFor("audio", 5);
    const plays = (profile: string) => generateSyntheticSample({ captchaId: "audio", profile, challenge, seed: 2 }).vector.values["playCount"];
    expect(plays("uniform-typing")).toBe(1);
    expect(plays("variable-typing")).toBe(2);
  });

  it("ships the documented profiles", () => {
    expect(PROFILES_BY_CAPTCHA["shape-matching"].map((p) => p.id)).toEqual(["immediate", "uniform-interval", "variable-interval"]);
    expect(PROFILES_BY_CAPTCHA.audio.map((p) => p.id)).toEqual(["uniform-typing", "variable-typing", "correction-typing"]);
    expect(PROFILES_BY_CAPTCHA.sequence.map((p) => p.id)).toEqual(["immediate", "uniform-timing", "variable-timing"]);
  });
});

describe("unmeasurable new signals stay missing, never zero", () => {
  it("a memory session analysed without a recall start has no recall counts", () => {
    const challenge = challengeFor("memory", 21, "sequence");
    const sample = generateSyntheticSample({ captchaId: "memory", profile: "uniform-interval", challenge, seed: 1 });
    const v = analyzeSession("memory", challenge, sample.session, { recallStartMs: null }).values;
    for (const k of ["activationCount", "wrongAttempts", "corrections", "activationTime", "interClickMean", "interClickCv", "pauseCount"]) expect(v[k], k).toBeNull();
  });

  it("a single activation or key has no gap to call a pause", () => {
    const sm = challengeFor("sequence", 1, "visual");
    const one = generateSyntheticSample({ captchaId: "sequence", profile: "uniform-timing", challenge: sm, seed: 1 }).vector.values;
    expect(one["activationCount"]).toBe(1);
    expect(one["pauseCount"]).toBeNull();
    expect(one["interClickCv"]).toBeNull();
    const math = generateSyntheticSample({ captchaId: "math-logic", profile: "uniform-typing", challenge: { ...(challengeFor("math-logic", 1) as MathChallenge), expectedAnswer: 7 }, seed: 1 }).vector.values;
    expect(math["pauseCount"]).toBeNull();
    expect(math["interKeyMean"]).toBeNull();
  });
});

