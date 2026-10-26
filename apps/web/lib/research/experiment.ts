import type { InteractionSession } from "@captchalab/captcha-core";
import { analyzeSession } from "@/lib/behavior/analysis";
import { classify, type Classification, type ClassificationLabel } from "@/lib/behavior/classifier";
import { derivedSeed, summarize } from "@/lib/behavior/reference";
import { SIGNALS_BY_CAPTCHA, signalDef } from "@/lib/behavior/signal-catalog";
import { defaultContext, generateSyntheticSample, profileDef, profileName } from "@/lib/behavior/synthetic";
import type { Translate } from "@/lib/i18n";
import { EN } from "@/lib/i18n";
import { SYNTHETIC_GENERATOR_VERSION, type BehaviorContext, type BehavioralVector, type SignalGroup } from "@/lib/behavior/types";
import { MAX_SEED, assertDefinition, generateChallenge, type ChallengeDefinition } from "./definition";
import { FormatError, MAX_RECORDED, MAX_RUNS_PER_SPEC, MAX_SYNTHETIC_SPECS, MAX_SYNTHETIC_TOTAL } from "./safe";

/** Where a session in the "recorded" list came from. A file never turns a generated session into a human one. */
export type SessionSource = { kind: "recorded" } | { kind: "synthetic"; profile: string; generator: string; seed: number };

/** A session recorded in this browser (or imported from a file: `imported`). Not a validated human dataset. */
export interface RecordedEntry {
  source: SessionSource;
  id: string;
  label: string;
  tags: string[];
  /** UI geometry the extractor needs (slider layout, drag board, rotation centre); absent for the others. */
  context: BehaviorContext;
  passed?: boolean;
  session: InteractionSession;
  imported: boolean;
}

/** A recipe for a batch of generated sessions: runs i = 0..runs-1 use seed derivedSeed(baseSeed, i). */
export interface SyntheticSpec {
  id: string;
  profile: string;
  baseSeed: number;
  runs: number;
  context: BehaviorContext;
}

export interface Experiment {
  name: string;
  notes: string;
  definition: ChallengeDefinition;
  recorded: RecordedEntry[];
  synthetic: SyntheticSpec[];
}

export type SampleKind = "recorded" | "synthetic";

export interface Sample {
  /** Unique within the experiment: recorded id, or `<specId>#<run>`. */
  id: string;
  kind: SampleKind;
  /** The cohort it belongs to: "recorded" or the synthetic spec id. */
  cohort: string;
  label: string;
  tags: readonly string[];
  imported: boolean;
  /** Recorded entries only: the provenance written in the file (or "recorded" for a local one). */
  source?: SessionSource;
  profile?: string;
  seed?: number;
  session: InteractionSession;
  context: BehaviorContext;
  vector: BehavioralVector;
  classification: Classification;
}

export const RECORDED_COHORT = "recorded";

export function emptyExperiment(definition: ChallengeDefinition, name = ""): Experiment {
  assertDefinition(definition);
  return { name, notes: "", definition, recorded: [], synthetic: [] };
}

export function syntheticTotal(exp: Experiment): number {
  return exp.synthetic.reduce((n, s) => n + s.runs, 0);
}

const nextId = (prefix: string, used: readonly string[]): string => {
  let n = used.length + 1;
  while (used.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

/** Adds a recorded session. Bounded; the experiment is returned as a new object (callers never mutate). */
export function withRecorded(exp: Experiment, entry: Omit<RecordedEntry, "id" | "imported" | "source"> & { id?: string; imported?: boolean; source?: SessionSource }): Experiment {
  if (exp.recorded.length >= MAX_RECORDED) throw new FormatError("too-large", `an experiment holds at most ${MAX_RECORDED} recorded sessions`);
  if (entry.session.captchaId !== exp.definition.captcha) throw new FormatError("incompatible", `the session is from "${entry.session.captchaId}", the experiment is "${exp.definition.captcha}"`);
  const needsLayout = exp.definition.captcha === "slider" || exp.definition.captcha === "drag-drop" || exp.definition.captcha === "rotation";
  if (needsLayout && entry.context === undefined) throw new FormatError("invalid", `a ${exp.definition.captcha} session needs the layout it was recorded in`);
  if (!needsLayout && entry.context !== undefined) throw new FormatError("invalid", `${exp.definition.captcha} sessions take no layout`);
  const id = entry.id ?? nextId("r", exp.recorded.map((r) => r.id));
  if (exp.recorded.some((r) => r.id === id)) throw new FormatError("invalid", `duplicate recorded session id "${id}"`);
  return { ...exp, recorded: [...exp.recorded, { ...entry, id, imported: entry.imported ?? false, source: entry.source ?? { kind: "recorded" } }] };
}

export function withoutRecorded(exp: Experiment, id: string): Experiment {
  return { ...exp, recorded: exp.recorded.filter((r) => r.id !== id) };
}

/** Validates and adds a synthetic batch. The context defaults to the first recorded session's, else the default one. */
export function withSynthetic(exp: Experiment, spec: { profile: string; baseSeed: number; runs: number; id?: string; context?: BehaviorContext }): Experiment {
  const captcha = exp.definition.captcha;
  if (!profileDef(captcha, spec.profile)) throw new FormatError("invalid", `"${spec.profile}" is not a synthetic profile of ${captcha}`);
  if (!Number.isInteger(spec.baseSeed) || spec.baseSeed < 0 || spec.baseSeed > MAX_SEED) throw new FormatError("invalid", `base seed must be a whole number from 0 to ${MAX_SEED}`);
  if (!Number.isInteger(spec.runs) || spec.runs < 1 || spec.runs > MAX_RUNS_PER_SPEC) throw new FormatError("invalid", `runs must be from 1 to ${MAX_RUNS_PER_SPEC}`);
  if (exp.synthetic.length >= MAX_SYNTHETIC_SPECS) throw new FormatError("too-large", `an experiment holds at most ${MAX_SYNTHETIC_SPECS} synthetic batches`);
  if (syntheticTotal(exp) + spec.runs > MAX_SYNTHETIC_TOTAL) throw new FormatError("too-large", `an experiment holds at most ${MAX_SYNTHETIC_TOTAL} synthetic runs in total`);
  const id = spec.id ?? nextId("s", exp.synthetic.map((s) => s.id));
  if (exp.synthetic.some((s) => s.id === id) || id === RECORDED_COHORT) throw new FormatError("invalid", `duplicate synthetic batch id "${id}"`);
  const context = spec.context ?? exp.recorded[0]?.context ?? defaultContext(captcha);
  return { ...exp, synthetic: [...exp.synthetic, { id, profile: spec.profile, baseSeed: spec.baseSeed, runs: spec.runs, context }] };
}

export function withoutSynthetic(exp: Experiment, id: string): Experiment {
  return { ...exp, synthetic: exp.synthetic.filter((s) => s.id !== id) };
}

/**
 * Every session of the experiment, analysed by the same extractors and classified by the same baseline. The
 * synthetic batches are regenerated from their specs on the experiment's ONE challenge, so a recorded session
 * and a generated one always refer to exactly the same challenge.
 */
export function materialize(exp: Experiment): Sample[] {
  const captcha = exp.definition.captcha;
  const challenge = generateChallenge(exp.definition);
  const samples: Sample[] = [];
  exp.recorded.forEach((r, i) => {
    const vector = analyzeSession(captcha, challenge, r.session, r.context);
    samples.push({
      id: r.id,
      kind: "recorded",
      cohort: RECORDED_COHORT,
      label: r.label.trim() || `Recorded session ${i + 1}`,
      tags: r.tags,
      imported: r.imported,
      source: r.source,
      session: r.session,
      context: r.context,
      vector,
      classification: classify(vector),
    });
  });
  for (const spec of exp.synthetic) {
    for (let i = 0; i < spec.runs; i++) {
      const seed = derivedSeed(spec.baseSeed, i);
      const s = generateSyntheticSample({ captchaId: captcha, profile: spec.profile, challenge, context: spec.context, seed });
      samples.push({
        id: `${spec.id}#${i + 1}`,
        kind: "synthetic",
        cohort: spec.id,
        label: `${profileName(captcha, spec.profile)} · seed ${seed}`,
        tags: [],
        imported: false,
        profile: spec.profile,
        seed,
        session: s.session,
        context: s.context,
        vector: s.vector,
        classification: classify(s.vector),
      });
    }
  }
  return samples;
}

// ------------------------------------------------------------------------------------------------- statistics

export interface SignalStats {
  signal: string;
  group: SignalGroup;
  /** Observations with a value. */
  count: number;
  /** Observations where the signal could not be measured (null). Never counted as 0. */
  missing: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
}

/** Descriptive statistics only: no test, no p-value, no claim of significance. Missing values are excluded. */
export function describeSignal(signal: string, observations: readonly (number | null | undefined)[]): SignalStats {
  const s = summarize(signal, observations);
  return {
    signal,
    group: signalDef(signal)?.group ?? "timing",
    count: s.values.length,
    missing: observations.length - s.values.length,
    min: s.min,
    max: s.max,
    mean: s.values.length === 0 ? null : s.values.reduce((a, b) => a + b, 0) / s.values.length,
    median: s.median,
  };
}

export function cohortSignalStats(samples: readonly Sample[], captcha: ChallengeDefinition["captcha"]): SignalStats[] {
  return SIGNALS_BY_CAPTCHA[captcha].map((signal) => describeSignal(signal, samples.map((s) => s.vector.values[signal])));
}

export type LabelCounts = Readonly<Record<ClassificationLabel, number>>;

/** How many sessions each classifier output got. Counts of outputs, not accuracy and not probabilities. */
export function labelCounts(samples: readonly Sample[]): LabelCounts {
  const c: Record<ClassificationLabel, number> = { "human-like": 0, "synthetic-like": 0, uncertain: 0 };
  for (const s of samples) c[s.classification.label]++;
  return c;
}

export interface Cohort {
  id: string;
  label: string;
  kind: SampleKind;
  samples: Sample[];
}

export function cohortsOf(exp: Experiment, samples: readonly Sample[], t: Translate = EN): Cohort[] {
  const out: Cohort[] = [];
  const recorded = samples.filter((s) => s.cohort === RECORDED_COHORT);
  if (exp.recorded.length > 0) out.push({ id: RECORDED_COHORT, label: t("Phiên đã ghi", "Recorded sessions"), kind: "recorded", samples: recorded });
  for (const spec of exp.synthetic) {
    out.push({
      id: spec.id,
      label: `${profileName(exp.definition.captcha, spec.profile, t)} · ${spec.runs}× · seed ${spec.baseSeed}`,
      kind: "synthetic",
      samples: samples.filter((s) => s.cohort === spec.id),
    });
  }
  return out;
}

export interface SampleFilter {
  kind?: SampleKind | "all";
  profile?: string;
  label?: ClassificationLabel | "all";
}

export function filterSamples(samples: readonly Sample[], f: SampleFilter): Sample[] {
  return samples.filter(
    (s) =>
      (f.kind === undefined || f.kind === "all" || s.kind === f.kind) &&
      (f.profile === undefined || f.profile === "all" || s.profile === f.profile) &&
      (f.label === undefined || f.label === "all" || s.classification.label === f.label),
  );
}

export const PIPELINE_VERSIONS = {
  sessionSchema: 2,
  syntheticGenerator: SYNTHETIC_GENERATOR_VERSION,
} as const;
