import { describe, expect, it } from "vitest";
import type { InteractionSession } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { derivedSeed } from "@/lib/behavior/reference";
import { generateSyntheticSample, PROFILES_BY_CAPTCHA, defaultContext } from "@/lib/behavior/synthetic";
import { BEHAVIOR_CAPTCHAS, type BehaviorCaptchaId } from "@/lib/behavior/types";
import {
  MAX_SEED,
  generateChallenge,
  readDefinitionFile,
  sameDefinition,
  toDefinitionFile,
  validateDefinition,
  type ChallengeDefinition,
} from "../definition";
import {
  cohortSignalStats,
  cohortsOf,
  describeSignal,
  emptyExperiment,
  filterSamples,
  labelCounts,
  materialize,
  withRecorded,
  withSynthetic,
  withoutRecorded,
  withoutSynthetic,
  type Experiment,
} from "../experiment";
import { CURRENT_VERSIONS, importText, readSession, readSessionFile, sessionJoins, toBundleFile, toSessionFile, toSummaryFile } from "../formats";
import { FormatError, MAX_IMPORT_BYTES, canonicalJson, integrityOf, parseUntrustedJson, safeFilename } from "../safe";

const def = (captcha: BehaviorCaptchaId, seed = 7, extra: Partial<ChallengeDefinition> = {}): ChallengeDefinition => {
  const set = VARIANT_SETS[captcha];
  return { captcha, variant: set.defaultSelection.variantId, difficulty: set.defaultSelection.difficulty, seed, ...extra };
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const fail = (fn: () => unknown): FormatError => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(FormatError);
    return e as FormatError;
  }
  throw new Error("expected a FormatError");
};

/** A session standing in for a locally recorded one (generated, but it is only data to the workspace). */
const stand = (d: ChallengeDefinition, profile: string, seed: number): InteractionSession =>
  generateSyntheticSample({ captchaId: d.captcha, profile, challenge: generateChallenge(d), seed }).session;

describe("challenge definition", () => {
  it.each(BEHAVIOR_CAPTCHAS)("%s: the same definition rebuilds the same challenge, another seed does not", (id) => {
    const d = def(id);
    expect(generateChallenge(d)).toEqual(generateChallenge({ ...d }));
    expect(generateChallenge({ ...d, seed: 8 })).not.toEqual(generateChallenge(d));
    expect((generateChallenge(d) as { config: { seed: string } }).config.seed).toBe("7");
  });

  it.each(BEHAVIOR_CAPTCHAS)("%s: every variant and difficulty it offers validates and generates", (id) => {
    for (const v of VARIANT_SETS[id].variants) {
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const d = { captcha: id, variant: v.id, difficulty, seed: 3 };
        if (v.difficulties[difficulty]) {
          expect(validateDefinition(d)).toEqual([]);
          expect(generateChallenge(d)).toBeTruthy();
        } else {
          expect(validateDefinition(d).join(" ")).toContain("no");
        }
      }
    }
  });

  it("validation names the problem and never repairs it", () => {
    expect(validateDefinition({ captcha: "memory", variant: "x", difficulty: "easy", seed: 1 })[0]).toContain("not supported");
    expect(validateDefinition({ captcha: "text", variant: "nope", difficulty: "easy", seed: 1 })[0]).toContain('Variant "nope"');
    expect(validateDefinition({ captcha: "text", variant: "clean", difficulty: "extreme", seed: 1 })[0]).toContain("Difficulty");
    for (const seed of [-1, 1.5, MAX_SEED + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(validateDefinition({ ...def("text"), seed }).join(" ")).toContain("Seed");
    }
    expect(fail(() => generateChallenge({ ...def("text"), variant: "nope" })).code).toBe("invalid");
    const checkbox = { captcha: "checkbox", variant: "classic", difficulty: "hard", seed: 1 };
    expect(validateDefinition({ ...checkbox, variant: VARIANT_SETS.checkbox.defaultSelection.variantId }).join(" ")).toContain("no");
  });

  it("round-trips through a file exactly, and the file carries the versions", () => {
    for (const id of BEHAVIOR_CAPTCHAS) {
      const d = def(id, 123456, { name: "My test" });
      const file = toDefinitionFile(d);
      expect(file).toMatchObject({ format: "challenge-definition", version: 1, captcha: id, seed: 123456, name: "My test" });
      expect(file.pluginVersion).toMatch(/^\d+\.\d+\.\d+$/);
      const back = readDefinitionFile(clone(file));
      expect(back).toEqual(d);
      expect(generateChallenge(back)).toEqual(generateChallenge(d));
    }
  });

  it("rejects other versions, other formats, unknown fields, plugin drift and edited parameters", () => {
    const file = toDefinitionFile(def("slider"));
    expect(fail(() => readDefinitionFile({ ...file, version: 2 })).code).toBe("unsupported-version");
    expect(fail(() => readDefinitionFile({ ...file, version: "1" })).code).toBe("unsupported-version");
    expect(fail(() => readDefinitionFile({ ...file, format: "other" })).code).toBe("unsupported-format");
    expect(fail(() => readDefinitionFile({ ...file, extra: 1 })).detail).toContain('unknown field "extra"');
    const { seed: _seed, ...missing } = file;
    void _seed;
    expect(fail(() => readDefinitionFile(missing)).detail).toContain('missing field "seed"');
    expect(fail(() => readDefinitionFile({ ...file, pluginVersion: "9.9.9" })).code).toBe("incompatible");
    expect(fail(() => readDefinitionFile({ ...file, parameters: { ...file.parameters, tolerance: 0.5 } })).code).toBe("incompatible");
    expect(fail(() => readDefinitionFile({ ...file, captcha: "audio" })).code).toBe("invalid");
    expect(fail(() => readDefinitionFile({ ...file, seed: "7" })).code).toBe("invalid");
    expect(fail(() => readDefinitionFile({ ...file, seed: 2 ** 32 })).code).toBe("invalid");
    expect(fail(() => readDefinitionFile({ ...file, name: "bad\u0000name" })).code).toBe("invalid");
    expect(fail(() => readDefinitionFile("text")).code).toBe("invalid");
    expect(fail(() => readDefinitionFile(null)).code).toBe("invalid");
  });

  it("sameDefinition ignores the name only", () => {
    expect(sameDefinition(def("text"), { ...def("text"), name: "x" })).toBe(true);
    expect(sameDefinition(def("text"), def("text", 8))).toBe(false);
    expect(sameDefinition(def("text"), { ...def("text"), variant: "noisy" })).toBe(false);
  });
});

describe("untrusted JSON", () => {
  it("rejects invalid JSON", () => {
    for (const text of ["", "{", "nope", "{'a':1}", "[1,]"]) expect(fail(() => parseUntrustedJson(text)).code).toBe("invalid-json");
  });

  it("rejects forbidden keys anywhere, including inside arrays and nested objects", () => {
    for (const text of ['{"__proto__":{"x":1}}', '{"a":{"constructor":1}}', '[{"b":{"prototype":{}}}]', '{"a":[{"__proto__":1}]}']) {
      expect(fail(() => parseUntrustedJson(text)).code).toBe("forbidden-key");
    }
    const parsed = parseUntrustedJson('{"safe":1}') as Record<string, unknown>;
    expect(({} as Record<string, unknown>)["safe"]).toBeUndefined();
    expect(parsed["safe"]).toBe(1);
  });

  it("rejects nesting that is deep, or so deep the parser gives up", () => {
    const deep = `${"[".repeat(40)}${"]".repeat(40)}`;
    expect(fail(() => parseUntrustedJson(deep)).code).toBe("too-deep");
    const huge = `${"[".repeat(200_000)}${"]".repeat(200_000)}`;
    expect(["too-deep", "invalid-json"]).toContain(fail(() => parseUntrustedJson(huge)).code);
  });

  it("rejects oversized text and very long strings", () => {
    expect(fail(() => parseUntrustedJson("x".repeat(MAX_IMPORT_BYTES + 1))).code).toBe("too-large");
    expect(fail(() => parseUntrustedJson(JSON.stringify({ a: "x".repeat(30_000) }))).code).toBe("too-large");
  });

  it("treats number-like strings as strings, never as numbers", () => {
    const file = toDefinitionFile(def("text"));
    for (const bad of ["NaN", "Infinity", "-Infinity", "1e999"]) {
      expect(fail(() => readDefinitionFile({ ...file, seed: bad })).code).toBe("invalid");
    }
    // JSON itself cannot spell NaN or Infinity.
    expect(fail(() => parseUntrustedJson('{"a":NaN}')).code).toBe("invalid-json");
    expect(fail(() => parseUntrustedJson('{"a":Infinity}')).code).toBe("invalid-json");
  });

  it("the importer never accepts code-like content as data", () => {
    const file = JSON.stringify({ ...toDefinitionFile(def("text")), name: "<img src=x onerror=alert(1)>" });
    // It is plain text, kept as text (React renders it escaped); it cannot become markup or run.
    const d = (importText(file) as { definition: ChallengeDefinition }).definition;
    expect(d.name).toBe("<img src=x onerror=alert(1)>");
    expect(fail(() => importText(JSON.stringify({ format: "challenge-definition", version: 1, run: "alert(1)" }))).code).not.toBe("");
    expect(fail(() => importText('{"format":"nope"}')).code).toBe("unsupported-format");
    expect(fail(() => importText("[]")).code).toBe("unsupported-format");
  });

  it("canonical JSON ignores key order; filenames are safe", () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { y: 1, x: 2 }], c: null } })).toBe(canonicalJson({ a: { c: null, d: [3, { x: 2, y: 1 }] }, b: 1 }));
    expect(integrityOf({ a: 1, b: 2 })).toBe(integrityOf({ b: 2, a: 1 }));
    expect(integrityOf({ a: 1 })).not.toBe(integrityOf({ a: 2 }));
    expect(() => canonicalJson({ a: Number.NaN })).toThrow(RangeError);
    expect(safeFilename("challenge", "slider", 12345)).toBe("captchalab-challenge-slider-12345.json");
    const nasty = safeFilename("../../etc/passwd", 'C:\\x"<>|', "  My Exp / run #1.json ");
    expect(nasty).toMatch(/^captchalab-[a-z0-9-]+\.json$/);
    expect(nasty).not.toMatch(/[\\/:.]{2}|\s/);
  });
});

describe("session files", () => {
  it.each(BEHAVIOR_CAPTCHAS)("%s: a session round-trips exactly (the exported wall-clock time aside)", (id) => {
    const d = def(id, 11);
    const profile = PROFILES_BY_CAPTCHA[id][0]!.id;
    const sample = generateSyntheticSample({ captchaId: id, profile, challenge: generateChallenge(d), seed: 4 });
    const file = toSessionFile(d, { kind: "synthetic", profile, seed: 4, session: sample.session, context: sample.context, label: "x", tags: ["run-1"] });
    expect(file.source).toEqual({ kind: "synthetic", profile, generator: "synthetic@1", seed: 4 });
    const back = readSessionFile(clone(file));
    expect(back.session).toEqual({ ...sample.session, startedAt: 0 });
    expect(back.context).toEqual(sample.context);
    expect(back.definition).toEqual(d);
    expect(back.tags).toEqual(["run-1"]);
    expect(back.source).toEqual(file.source);
  });

  it("a recorded session is not labelled human by being imported", () => {
    const d = def("checkbox", 777);
    const file = toSessionFile(d, { kind: "recorded", session: stand(d, "delayed", 1), context: undefined, passed: true });
    const parsed = readSessionFile(clone(file));
    expect(parsed.source).toEqual({ kind: "recorded" });
    expect(JSON.stringify(file)).not.toMatch(/human|bot/i);
  });

  it("rejects malformed, foreign and hostile sessions", () => {
    const d = def("checkbox", 777);
    type SessionJson = Record<string, unknown> & { session: Record<string, unknown> & { events: Record<string, unknown>[] } };
    const good = clone(toSessionFile(d, { kind: "recorded", session: stand(d, "delayed", 1), context: undefined })) as unknown as SessionJson;
    const mutate = (fn: (f: SessionJson) => void) => {
      const f = clone(good);
      fn(f);
      return () => readSessionFile(f);
    };
    expect(fail(mutate((f) => (f.session.schemaVersion = 1))).code).toBe("unsupported-version");
    expect(fail(mutate((f) => (f.session.captchaId = "text"))).code).toBe("incompatible");
    expect(fail(mutate((f) => (f.session.events[0]!["t"] = -5))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.session.events[0]!["t"] = "NaN"))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.session.events[0]!["type"] = "mousedown"))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.session.events[0]!["x"] = 1e9))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.session.events[0]!["extra"] = 1))).detail).toContain("unknown field");
    expect(fail(mutate((f) => (f.session.events[0]!["target"] = "<script>"))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.session.events = [f.session.events[1]!, f.session.events[0]!]))).detail).toContain("back in time");
    expect(fail(mutate((f) => (f.session.durationMs = 0))).detail).toContain("shorter");
    expect(fail(mutate((f) => (f.session.inputModality = "touch"))).detail).toContain("does not match");
    expect(fail(mutate((f) => (f.session.events = Array.from({ length: 20_001 }, () => f.session.events[0]!)))).detail).toContain("more than");
    expect(fail(mutate((f) => (f.context = { width: 1, height: 1 }))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.source = { kind: "synthetic", profile: "nope", generator: "synthetic@1", seed: 1 }))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.source = { kind: "human" }))).code).toBe("invalid");
    expect(fail(mutate((f) => (f.tags = ["<b>"]))).code).toBe("invalid");
    expect(() => readSession({ ...good.session, events: [{ t: Number.POSITIVE_INFINITY, type: "keydown", code: "Space" }] }, "s", "checkbox")).toThrow(FormatError);
  });

  it("a session must belong to the experiment it joins", () => {
    const d = def("checkbox", 777);
    const parsed = readSessionFile(clone(toSessionFile(d, { kind: "recorded", session: stand(d, "delayed", 1), context: undefined })));
    expect(() => sessionJoins(emptyExperiment(d), parsed)).not.toThrow();
    expect(fail(() => sessionJoins(emptyExperiment(def("checkbox", 778)), parsed)).code).toBe("incompatible");
    expect(fail(() => sessionJoins(emptyExperiment(def("text", 777)), parsed)).code).toBe("incompatible");
    expect(fail(() => withRecorded(emptyExperiment(def("text", 777)), { label: "", tags: [], context: undefined, session: parsed.session })).code).toBe("incompatible");
  });
});

describe("experiment batches", () => {
  const base = (): Experiment => emptyExperiment(def("text", 31), "T");

  it("derived seeds are consecutive from the base and wrap at 2^32", () => {
    expect([0, 1, 2].map((i) => derivedSeed(100, i))).toEqual([100, 101, 102]);
    expect(derivedSeed(MAX_SEED, 1)).toBe(0);
  });

  it("the same experiment configuration materializes the same samples, run after run", () => {
    const exp = withSynthetic(withSynthetic(base(), { profile: "variable-typing", baseSeed: 10, runs: 12 }), { profile: "uniform-typing", baseSeed: 0, runs: 3 });
    const a = materialize(exp);
    const b = materialize(exp);
    expect(a.map((s) => s.id)).toEqual([...Array.from({ length: 12 }, (_, i) => `s1#${i + 1}`), "s2#1", "s2#2", "s2#3"]);
    expect(b.map((s) => [s.vector, s.classification, s.seed])).toEqual(a.map((s) => [s.vector, s.classification, s.seed]));
    expect(a[0]!.seed).toBe(10);
    expect(a[11]!.seed).toBe(21);
    expect(new Set(a.slice(0, 12).map((s) => s.vector.values["interKeyCv"])).size).toBeGreaterThan(1);
  });

  it("is bounded: runs per batch, batches, total runs and recorded sessions", () => {
    expect(fail(() => withSynthetic(base(), { profile: "variable-typing", baseSeed: 1, runs: 101 })).code).toBe("invalid");
    expect(fail(() => withSynthetic(base(), { profile: "variable-typing", baseSeed: 1, runs: 0 })).code).toBe("invalid");
    expect(fail(() => withSynthetic(base(), { profile: "variable-typing", baseSeed: 1.5, runs: 3 })).code).toBe("invalid");
    expect(fail(() => withSynthetic(base(), { profile: "nope", baseSeed: 1, runs: 3 })).code).toBe("invalid");
    let exp = base();
    for (let i = 0; i < 3; i++) exp = withSynthetic(exp, { profile: "variable-typing", baseSeed: i, runs: 100 });
    expect(fail(() => withSynthetic(exp, { profile: "variable-typing", baseSeed: 9, runs: 1 })).code).toBe("too-large");
    let many = base();
    for (let i = 0; i < 12; i++) many = withSynthetic(many, { profile: "variable-typing", baseSeed: i, runs: 1 });
    expect(fail(() => withSynthetic(many, { profile: "variable-typing", baseSeed: 99, runs: 1 })).code).toBe("too-large");
    let rec = base();
    for (let i = 0; i < 100; i++) rec = withRecorded(rec, { label: "", tags: [], context: undefined, session: stand(rec.definition, "variable-typing", 1) });
    expect(fail(() => withRecorded(rec, { label: "", tags: [], context: undefined, session: stand(rec.definition, "variable-typing", 1) })).code).toBe("too-large");
  });

  it("adding and removing never mutates the previous experiment", () => {
    const e0 = base();
    const e1 = withSynthetic(e0, { profile: "variable-typing", baseSeed: 1, runs: 2 });
    expect(e0.synthetic).toHaveLength(0);
    expect(withoutSynthetic(e1, "s1").synthetic).toHaveLength(0);
    expect(e1.synthetic).toHaveLength(1);
    const e2 = withRecorded(e1, { label: "a", tags: [], context: undefined, session: stand(e1.definition, "variable-typing", 1) });
    expect(withoutRecorded(e2, "r1").recorded).toHaveLength(0);
    expect(e2.recorded).toHaveLength(1);
  });

  it("synthetic batches use the first recorded session's layout, so both are measured in one space", () => {
    const d = def("slider", 5);
    const ctx = { trackLeft: 10, trackWidth: 400, handleWidth: 40 };
    let exp = emptyExperiment(d);
    expect(withSynthetic(exp, { profile: "linear", baseSeed: 1, runs: 1 }).synthetic[0]!.context).toEqual(defaultContext("slider"));
    exp = withRecorded(exp, { label: "", tags: [], context: ctx, session: generateSyntheticSample({ captchaId: "slider", profile: "noisy", challenge: generateChallenge(d), context: ctx, seed: 1 }).session });
    expect(withSynthetic(exp, { profile: "linear", baseSeed: 1, runs: 1 }).synthetic[0]!.context).toEqual(ctx);
  });
});

describe("statistics keep missing as missing", () => {
  it("excludes null from every statistic and counts it separately", () => {
    const s = describeSignal("interClickCv", [0.1, null, 0.3, null, undefined, 0.2]);
    expect(s).toMatchObject({ count: 3, missing: 3, min: 0.1, max: 0.3, median: 0.2 });
    expect(s.mean).toBeCloseTo(0.2, 10);
    const none = describeSignal("interClickCv", [null, null]);
    expect(none).toMatchObject({ count: 0, missing: 2, min: null, max: null, mean: null, median: null });
  });

  it("a keyboard-like checkbox batch has missing rhythm signals, not zeros", () => {
    const exp = withSynthetic(emptyExperiment(def("checkbox", 777)), { profile: "immediate", baseSeed: 1, runs: 5 });
    const samples = materialize(exp);
    const cv = cohortSignalStats(samples, "checkbox").find((s) => s.signal === "interClickCv")!;
    expect(cv).toMatchObject({ count: 0, missing: 5, mean: null });
  });

  it("counts classifier outputs and filters without changing the data", () => {
    const exp = withSynthetic(withSynthetic(emptyExperiment(def("text", 31)), { profile: "uniform-typing", baseSeed: 1, runs: 4 }), { profile: "correction-typing", baseSeed: 1, runs: 6 });
    const samples = materialize(exp);
    const counts = labelCounts(samples);
    expect(counts["human-like"] + counts["synthetic-like"] + counts.uncertain).toBe(10);
    expect(filterSamples(samples, { profile: "uniform-typing" })).toHaveLength(4);
    expect(filterSamples(samples, { kind: "recorded" })).toHaveLength(0);
    expect(filterSamples(samples, { label: "synthetic-like" }).every((s) => s.classification.label === "synthetic-like")).toBe(true);
    expect(filterSamples(samples, {})).toHaveLength(10);
    expect(cohortsOf(exp, samples).map((c) => c.samples.length)).toEqual([4, 6]);
  });
});

describe("experiment bundle round-trip", () => {
  const build = (id: BehaviorCaptchaId): Experiment => {
    const d = def(id, 42, { name: "round trip" });
    let exp: Experiment = { ...emptyExperiment(d, "Round trip"), notes: "A note with <b>markup</b> and\nnewlines." };
    const profiles = PROFILES_BY_CAPTCHA[id];
    exp = withRecorded(exp, { label: "first", tags: ["run-1", "left hand"], context: defaultContext(id), passed: true, session: stand(d, profiles[0]!.id, 1) });
    exp = withRecorded(exp, { label: "", tags: [], context: defaultContext(id), session: stand(d, profiles[1]!.id, 2) });
    exp = withSynthetic(exp, { profile: profiles[0]!.id, baseSeed: 100, runs: 7 });
    exp = withSynthetic(exp, { profile: profiles[1]!.id, baseSeed: 5, runs: 3 });
    return exp;
  };

  it.each(BEHAVIOR_CAPTCHAS)("%s: export, parse in a fresh state, and get the same experiment and the same results", (id) => {
    const original = build(id);
    const text = JSON.stringify(toBundleFile(original, new Date("2026-10-26T10:00:00Z")));
    const imported = importText(text);
    expect(imported.kind).toBe("experiment");
    if (imported.kind !== "experiment") return;
    expect(imported.parsed.warnings).toEqual([]);
    expect(imported.parsed.versions).toEqual(CURRENT_VERSIONS);
    const back = imported.parsed.experiment;

    // Exact: the challenge identity, the recipes, the notes and every recorded event.
    expect(back.definition).toEqual(original.definition);
    expect(back.synthetic).toEqual(original.synthetic);
    expect(back.name).toBe(original.name);
    expect(back.notes).toBe(original.notes);
    expect(back.recorded.map((r) => ({ ...r, imported: false }))).toEqual(original.recorded.map((r) => ({ ...r, session: { ...r.session, startedAt: 0 } })));
    expect(back.recorded.every((r) => r.imported)).toBe(true);

    // And so everything derived from them.
    const a = materialize(original);
    const b = materialize(back);
    expect(b.map((s) => s.id)).toEqual(a.map((s) => s.id));
    expect(b.map((s) => s.vector)).toEqual(a.map((s) => s.vector));
    expect(b.map((s) => s.classification)).toEqual(a.map((s) => s.classification));
    expect(b.filter((s) => s.kind === "synthetic").map((s) => s.session)).toEqual(a.filter((s) => s.kind === "synthetic").map((s) => s.session));

    // Exporting again gives the same checksum even at another time: the creation time is not part of it.
    const again = toBundleFile(back, new Date("2027-01-01T00:00:00Z"));
    const first = toBundleFile(original, new Date("2026-10-26T10:00:00Z"));
    expect(again.integrity.value).toBe(first.integrity.value);
  });

  it("the checksum notices edits but the file is still read (it is a checksum, not a signature)", () => {
    const file = clone(toBundleFile(build("text"))) as unknown as { notes: string };
    file.notes = "edited";
    const imported = importText(JSON.stringify(file));
    expect(imported.kind === "experiment" && imported.parsed.warnings.join(" ")).toContain("checksum");
    expect(imported.kind === "experiment" && imported.parsed.experiment.notes).toBe("edited");
  });

  it("is deterministic to serialize: key order never changes the checksum", () => {
    const file = toBundleFile(build("slider"), new Date("2026-10-26T10:00:00Z"));
    const reordered: unknown = JSON.parse(JSON.stringify(file), (_k, v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v));
    const imported = importText(JSON.stringify(reordered));
    expect(imported.kind === "experiment" && imported.parsed.warnings).toEqual([]);
  });

  it("rejects adversarial and incompatible bundles", () => {
    const good = clone(toBundleFile(build("text"))) as unknown as Record<string, unknown> & { recorded: Record<string, unknown>[]; synthetic: Record<string, unknown>[]; versions: Record<string, unknown> };
    const run = (fn: (f: typeof good) => void) => () => {
      const f = clone(good);
      fn(f);
      return importText(JSON.stringify(f));
    };
    expect(fail(run((f) => (f.version = 2))).code).toBe("unsupported-version");
    expect(fail(run((f) => (f.versions["sessionSchema"] = 3))).code).toBe("unsupported-version");
    expect(fail(run((f) => (f["extra"] = 1))).code).toBe("invalid");
    expect(fail(run((f) => delete f["integrity"])).code).toBe("invalid");
    expect(fail(run((f) => (f.synthetic[0]!["profile"] = "linear"))).code).toBe("invalid");
    expect(fail(run((f) => (f.synthetic[0]!["runs"] = 100_000))).code).toBe("invalid");
    expect(fail(run((f) => (f.synthetic[0]!["runs"] = "5"))).code).toBe("invalid");
    expect(fail(run((f) => (f.synthetic[0]!["baseSeed"] = -1))).code).toBe("invalid");
    expect(fail(run((f) => (f.synthetic = Array.from({ length: 13 }, () => f.synthetic[0]!)))).code).toBe("invalid");
    expect(fail(run((f) => (f.recorded = Array.from({ length: 101 }, () => f.recorded[0]!)))).code).toBe("invalid");
    expect(fail(run((f) => (f.recorded[1]!["id"] = f.recorded[0]!["id"]))).detail).toContain("not unique");
    expect(fail(run((f) => (f.synthetic[1]!["id"] = f.synthetic[0]!["id"]))).detail).toContain("not unique");
    expect(fail(run((f) => (f.recorded[0]!["id"] = "recorded"))).detail).toContain("not unique");
    expect(fail(run((f) => (f.versions["syntheticGenerator"] = "synthetic@2"))).code).toBe("incompatible");
    expect(fail(run((f) => Object.defineProperty(f, "__proto__", { value: { polluted: true }, enumerable: true, configurable: true, writable: true }))).code).toBe("forbidden-key");
    expect(fail(run((f) => (f.recorded[0]!["constructor"] = 1))).code).toBe("forbidden-key");
    expect(fail(run((f) => (f.notes = "x".repeat(6000)))).code).toBe("invalid");
    expect(fail(run((f) => (f.notes = "bad\u0007"))).code).toBe("invalid");
    expect(fail(run((f) => (f["name"] = 5))).code).toBe("invalid");
    expect(fail(run((f) => ((f.recorded[0]!["session"] as { captchaId: string }).captchaId = "slider"))).code).toBe("incompatible");
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("a newer pipeline version is reported, not silently reinterpreted", () => {
    const f = clone(toBundleFile(emptyExperiment(def("text", 1)))) as unknown as { versions: Record<string, string>; integrity: unknown };
    f.versions["classifier"] = "behavioral-baseline@2";
    f.versions["signals"] = "behavior-signals@2";
    const parsed = importText(JSON.stringify(f));
    expect(parsed.kind === "experiment" && parsed.parsed.warnings.join("|")).toContain("behavioral-baseline@2");
    expect(parsed.kind === "experiment" && parsed.parsed.warnings.join("|")).toContain("behavior-signals@2");
  });

  it("a summary is one-way and holds counts and statistics only", () => {
    const exp = build("text");
    const summary = toSummaryFile(exp, materialize(exp), new Date("2026-10-26T10:00:00Z"));
    expect(summary).toMatchObject({ format: "experiment-summary", version: 1 });
    expect(summary.cohorts.map((c) => c.count)).toEqual([2, 7, 3]);
    expect(JSON.stringify(summary)).not.toContain('"events"');
    expect(JSON.stringify(summary)).not.toMatch(/accuracy|precision|recall|probab/i);
    expect(fail(() => importText(JSON.stringify(summary))).detail).toContain("one-way");
  });
});

describe("pipeline cost (bounded sizes)", () => {
  it.each([30, 100, 300])("%i synthetic sessions materialize in well under the interactive budget", (n) => {
    const exp = withSynthetic(emptyExperiment(def("drag-drop", 4242)), { profile: "noisy", baseSeed: 1, runs: Math.min(n, 100) });
    let all = exp;
    for (let i = 1; i < Math.ceil(n / 100); i++) all = withSynthetic(all, { profile: "noisy", baseSeed: 1000 * i, runs: Math.min(100, n - 100 * i) });
    const t0 = performance.now();
    const samples = materialize(all);
    const ms = performance.now() - t0;
    expect(samples).toHaveLength(n);
    expect(ms).toBeLessThan(20_000);
  });
});

describe("import order and provenance", () => {
  it("names a wrong version before it reads anything else, and a wrong format before the version", () => {
    for (const format of ["challenge-definition", "interaction-session", "experiment-bundle", "experiment-summary"]) {
      expect(fail(() => importText(JSON.stringify({ format }))).code).toBe("unsupported-version");
      expect(fail(() => importText(JSON.stringify({ format, version: 2, junk: true }))).code).toBe("unsupported-version");
    }
    expect(fail(() => importText(JSON.stringify({ format: "other", version: 1 }))).code).toBe("unsupported-format");
  });

  it("a generated session joins the recorded list without turning into a human one, and survives a round trip", () => {
    const d = def("checkbox", 777);
    const synthetic = generateSyntheticSample({ captchaId: "checkbox", profile: "delayed", challenge: generateChallenge(d), seed: 9 });
    const file = readSessionFile(clone(toSessionFile(d, { kind: "synthetic", profile: "delayed", seed: 9, session: synthetic.session, context: undefined })));
    expect(file.source).toEqual({ kind: "synthetic", profile: "delayed", generator: "synthetic@1", seed: 9 });
    const exp = withRecorded(emptyExperiment(d), { label: "", tags: [], context: file.context, session: file.session, imported: true, source: file.source });
    const imported = importText(JSON.stringify(toBundleFile(exp)));
    expect(imported.kind === "experiment" && imported.parsed.experiment.recorded[0]!.source).toEqual(file.source);
    expect(materialize(exp)[0]!.source).toEqual(file.source);
    expect(materialize(exp)[0]!.kind).toBe("recorded");
  });

  it("a recorded entry must carry exactly the layout its CAPTCHA needs", () => {
    const d = def("slider", 1);
    const s = stand(d, "linear", 1);
    expect(fail(() => withRecorded(emptyExperiment(d), { label: "", tags: [], context: undefined, session: s })).code).toBe("invalid");
    expect(fail(() => withRecorded(emptyExperiment(def("checkbox", 1)), { label: "", tags: [], context: { width: 1, height: 1 }, session: stand(def("checkbox", 1), "delayed", 1) })).code).toBe("invalid");
  });
});

describe("memory and time are bounded before parsing", () => {
  it("rejects a wide array of millions of values quickly, without building it", () => {
    const t0 = performance.now();
    const wide = `[${"0,".repeat(3_000_000)}0]`;
    expect(fail(() => parseUntrustedJson(wide)).code).toBe("too-large");
    expect(performance.now() - t0).toBeLessThan(3000);
  });

  it("rejects deep nesting from the text alone", () => {
    expect(fail(() => parseUntrustedJson("[".repeat(10_000))).code).toBe("too-deep");
    expect(fail(() => parseUntrustedJson(`{"a":`.repeat(30) + "1" + "}".repeat(30))).code).toBe("too-deep");
  });

  it("brackets, commas and quotes inside strings are not structure", () => {
    const value = { a: "[[[[[[[[[[[[[[[[[[[[,,,,,,,,]]]]]]]", b: 'quote " and ' + String.fromCharCode(92) + " backslash [[[[", c: [1, 2, 3] };
    expect(parseUntrustedJson(JSON.stringify(value))).toEqual(value);
  });

  it("caps the events of a whole bundle, not only of one session", () => {
    const d = def("text", 31);
    const big = stand(d, "variable-typing", 1);
    const events = Array.from({ length: 9000 }, (_, i) => ({ t: i, type: "keydown" as const, code: "Letter", target: "text-input" }));
    const session: InteractionSession = { ...big, events, durationMs: 9000, inputModality: "keyboard" };
    let exp = emptyExperiment(d);
    for (let i = 0; i < 17; i++) exp = withRecorded(exp, { label: "", tags: [], context: undefined, session });
    const file = clone(toBundleFile(exp));
    expect(fail(() => importText(JSON.stringify(file))).detail).toContain("events in total");
  });
});

