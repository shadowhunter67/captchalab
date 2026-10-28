import { SCHEMA_VERSION, inferModality, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import { analyzeSession } from "@/lib/behavior/analysis";
import { CLASSIFIER_VERSION } from "@/lib/behavior/classifier";
import { extractMemoryActivations, toTextKeyCode, type MemoryChallenge } from "@captchalab/captcha-plugins";
import { SYNTHETIC_GENERATOR_VERSION, BEHAVIOR_FEATURE_SET, type BehaviorCaptchaId, type BehaviorContext, type MemoryContext } from "@/lib/behavior/types";
import { profileDef } from "@/lib/behavior/synthetic";
import { memoryContext } from "@/lib/behavior/synthetic/generators-more";
import {
  CHALLENGE_DEFINITION_FORMAT,
  generateChallenge,
  readDefinitionFile,
  sameDefinition,
  toDefinitionFile,
  type ChallengeDefinition,
  type DefinitionFile,
} from "./definition";
import {
  type Experiment,
  type RecordedEntry,
  type SessionSource,
  type Sample,
  type SyntheticSpec,
  RECORDED_COHORT,
  cohortSignalStats,
  cohortsOf,
  labelCounts,
} from "./experiment";
import {
  FormatError,
  INTEGRITY_ALGORITHM,
  MAX_EVENTS_PER_SESSION,
  MAX_EVENTS_TOTAL,
  MAX_RECORDED,
  MAX_RUNS_PER_SPEC,
  MAX_SYNTHETIC_SPECS,
  MAX_SYNTHETIC_TOTAL,
  integrityOf,
  parseUntrustedJson,
  readArray,
  readBoolean,
  readInt,
  readNumber,
  readObject,
  readString,
  readText,
  type Rec,
} from "./safe";

export const INTERACTION_SESSION_FORMAT = "interaction-session" as const;
export const EXPERIMENT_BUNDLE_FORMAT = "experiment-bundle" as const;
export const EXPERIMENT_SUMMARY_FORMAT = "experiment-summary" as const;
export const FORMAT_VERSION = 1 as const;

/**
 * Compatibility policy (documented in docs/data-formats.md): every format has an integer `version`. A file with
 * another version is rejected ("unsupported format version"), never reinterpreted. Objects are STRICT: an unknown
 * field is an error, not ignored, so a file means exactly what it says. Pipeline versions (signals, classifier)
 * inside a bundle may differ from this app's: the data is still read and the difference is shown as a warning.
 */

// ------------------------------------------------------------------------------------------------ session

const POINTER_TYPES = ["mouse", "touch", "pen"] as const;
const POINTER_KINDS = ["pointermove", "pointerdown", "pointerup", "pointercancel", "click", "touchstart", "touchmove", "touchend"] as const;
const KEY_KINDS = ["keydown", "keyup"] as const;
const TARGET = /^[A-Za-z0-9:_-]{1,64}$/;
const KEY_CODE = /^[A-Za-z0-9]{1,24}$/;
const COORD = 1_000_000;

/** Fields that hold typed characters. Their key codes are stored by class only, so a file must carry nothing finer. */
const TYPING_TARGETS = new Set(["text-input", "math-input", "audio-input", "sequence-input"]);
const COARSE_CLASSES = new Set(["Letter", "Digit", "Other"]);
const isCoarseKey = (code: string): boolean => COARSE_CLASSES.has(code) || toTextKeyCode(code) === code;

const TYPING_CAPTCHAS = new Set(["text", "math-logic", "audio", "sequence"]);

function readEvent(v: unknown, path: string, captcha: BehaviorCaptchaId): InteractionEvent {
  const base = typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : undefined;
  const type = base?.["type"];
  if (typeof type === "string" && (KEY_KINDS as readonly string[]).includes(type)) {
    const o = readObject(v, path, ["t", "type", "code"], ["target"]);
    const code = readString(o["code"], `${path}.code`, 24, KEY_CODE);
    if ((TYPING_CAPTCHAS.has(captcha) || (typeof o["target"] === "string" && TYPING_TARGETS.has(o["target"]))) && !isCoarseKey(code)) {
      throw new FormatError("invalid", `${path}.code: a typing field may only hold key classes (Letter, Digit, Other) and control keys, never which key was typed`);
    }
    return {
      t: readNumber(o["t"], `${path}.t`, 0, 1e10),
      type: type as (typeof KEY_KINDS)[number],
      code,
      ...(o["target"] === undefined ? {} : { target: readString(o["target"], `${path}.target`, 64, TARGET) }),
    };
  }
  const o = readObject(v, path, ["t", "type", "x", "y", "pointerId", "pointerType"], ["target", "pressure"]);
  const kind = readString(o["type"], `${path}.type`, 16);
  if (!(POINTER_KINDS as readonly string[]).includes(kind)) throw new FormatError("invalid", `${path}.type: unknown event type "${kind}"`);
  const pointerType = readString(o["pointerType"], `${path}.pointerType`, 8);
  if (!(POINTER_TYPES as readonly string[]).includes(pointerType)) throw new FormatError("invalid", `${path}.pointerType: unknown pointer type`);
  return {
    t: readNumber(o["t"], `${path}.t`, 0, 1e10),
    type: kind as (typeof POINTER_KINDS)[number],
    x: readNumber(o["x"], `${path}.x`, -COORD, COORD),
    y: readNumber(o["y"], `${path}.y`, -COORD, COORD),
    pointerId: readInt(o["pointerId"], `${path}.pointerId`, -1_000_000, 1_000_000),
    pointerType: pointerType as (typeof POINTER_TYPES)[number],
    ...(o["pressure"] === undefined ? {} : { pressure: readNumber(o["pressure"], `${path}.pressure`, 0, 1) }),
    ...(o["target"] === undefined ? {} : { target: readString(o["target"], `${path}.target`, 64, TARGET) }),
  };
}

/** An InteractionSession read field by field from untrusted data. */
export function readSession(v: unknown, path: string, captcha: BehaviorCaptchaId): InteractionSession {
  const o = readObject(v, path, ["schemaVersion", "id", "captchaId", "startedAt", "durationMs", "events", "inputModality"], ["viewport"]);
  if (o["schemaVersion"] !== SCHEMA_VERSION) throw new FormatError("unsupported-version", `${path}.schemaVersion ${String(o["schemaVersion"])} (this app reads ${SCHEMA_VERSION})`);
  const captchaId = readString(o["captchaId"], `${path}.captchaId`, 32);
  if (captchaId !== captcha) throw new FormatError("incompatible", `${path}: the session is from "${captchaId}" but the challenge is "${captcha}"`);
  const events = readArray(o["events"], `${path}.events`, MAX_EVENTS_PER_SESSION).map((e, i) => readEvent(e, `${path}.events[${i}]`, captcha));
  let last = 0;
  events.forEach((e, i) => {
    if (e.t < last) throw new FormatError("invalid", `${path}.events[${i}].t goes back in time`);
    last = e.t;
  });
  const durationMs = readNumber(o["durationMs"], `${path}.durationMs`, 0, 1e10);
  if (durationMs < last) throw new FormatError("invalid", `${path}.durationMs is shorter than the last event`);
  const inputModality = readString(o["inputModality"], `${path}.inputModality`, 16);
  if (inputModality !== inferModality(events)) throw new FormatError("invalid", `${path}.inputModality does not match the events`);
  let viewport: { width: number; height: number } | undefined;
  if (o["viewport"] !== undefined) {
    const vp = readObject(o["viewport"], `${path}.viewport`, ["width", "height"]);
    viewport = { width: readNumber(vp["width"], `${path}.viewport.width`, 0, 100_000), height: readNumber(vp["height"], `${path}.viewport.height`, 0, 100_000) };
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    id: readString(o["id"], `${path}.id`, 64, /^[A-Za-z0-9-]{1,64}$/),
    captchaId: captcha,
    startedAt: readNumber(o["startedAt"], `${path}.startedAt`, 0, 1e15),
    durationMs,
    events,
    inputModality: inputModality,
    ...(viewport ? { viewport } : {}),
  };
}

/** The session as it is written to a file. `startedAt` (a wall-clock time) is not exported: analysis never uses it. */
function sessionForExport(s: InteractionSession): InteractionSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: s.id,
    captchaId: s.captchaId,
    startedAt: 0,
    durationMs: s.durationMs,
    events: s.events.map((e) => ({ ...e })),
    inputModality: s.inputModality,
  };
}

// ------------------------------------------------------------------------------------------------ context

/** The geometry an extractor needs, strictly typed per CAPTCHA. The others must not carry one. */
export function readContext(v: unknown, path: string, captcha: BehaviorCaptchaId): BehaviorContext {
  if (v === undefined) {
    if (captcha === "slider" || captcha === "drag-drop" || captcha === "rotation" || captcha === "memory") throw new FormatError("invalid", `${path}: ${captcha} needs its layout`);
    return undefined;
  }
  switch (captcha) {
    case "slider": {
      const o = readObject(v, path, ["trackLeft", "trackWidth", "handleWidth"]);
      const trackWidth = readNumber(o["trackWidth"], `${path}.trackWidth`, 1, 100_000);
      const handleWidth = readNumber(o["handleWidth"], `${path}.handleWidth`, 1, 100_000);
      if (handleWidth >= trackWidth) throw new FormatError("invalid", `${path}: the handle is wider than the track`);
      return { trackLeft: readNumber(o["trackLeft"], `${path}.trackLeft`, -100_000, 100_000), trackWidth, handleWidth };
    }
    case "drag-drop": {
      const o = readObject(v, path, ["width", "height"]);
      return { width: readNumber(o["width"], `${path}.width`, 1, 100_000), height: readNumber(o["height"], `${path}.height`, 1, 100_000) };
    }
    case "rotation": {
      const o = readObject(v, path, ["center"]);
      const c = readObject(o["center"], `${path}.center`, ["x", "y"]);
      return { center: { x: readNumber(c["x"], `${path}.center.x`, -COORD, COORD), y: readNumber(c["y"], `${path}.center.y`, -COORD, COORD) } };
    }
    case "memory": {
      const o = readObject(v, path, ["recallStartMs"]);
      return { recallStartMs: o["recallStartMs"] === null ? null : readNumber(o["recallStartMs"], `${path}.recallStartMs`, 0, 1e10) };
    }
    default:
      throw new FormatError("invalid", `${path}: ${captcha} takes no layout`);
  }
}

function contextForExport(c: BehaviorContext): BehaviorContext {
  return c === undefined ? undefined : (JSON.parse(JSON.stringify(c)) as BehaviorContext);
}

// ----------------------------------------------------------------------------------------- tags and labels

const readLabel = (v: unknown, path: string): string => readText(v, path, 80);

function readTags(v: unknown, path: string): string[] {
  return readArray(v, path, 12).map((t, i) => readString(t, `${path}[${i}]`, 40, /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/));
}

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * A Memory session's recall clock decides which actions count, so a forged value could hide or move actions. It must
 * be consistent with the events: after a completed Start press plus the preview, and not after the first recall
 * action; `null` only when there is no recall action at all. A session claiming a synthetic source must carry exactly
 * the clock the generator derives.
 */
export function checkMemoryContext(definition: ChallengeDefinition, session: InteractionSession, context: BehaviorContext, source: SessionSource, path: string): void {
  if (definition.captcha !== "memory") return;
  const challenge = generateChallenge(definition) as MemoryChallenge;
  const recallStart = (context as MemoryContext).recallStartMs;
  const acts = extractMemoryActivations(session);
  const start = acts.find((a) => a.act.kind === "start");
  const firstRecall = acts.find((a) => a.act.kind !== "start");
  if (recallStart === null) {
    if (firstRecall) throw new FormatError("incompatible", `${path}.context.recallStartMs is null but the session has recall actions`);
  } else {
    if (!start) throw new FormatError("incompatible", `${path}.context.recallStartMs is set but the session has no completed Start press`);
    if (recallStart < start.t + challenge.previewMs - 100) throw new FormatError("incompatible", `${path}.context.recallStartMs is earlier than the preview allows`);
    if (recallStart > session.durationMs || (firstRecall && recallStart > firstRecall.t)) throw new FormatError("incompatible", `${path}.context.recallStartMs is later than the recall actions it should include`);
  }
  if (source.kind === "synthetic" && recallStart !== memoryContext(challenge).recallStartMs) {
    throw new FormatError("incompatible", `${path}.context.recallStartMs does not match the generator for this challenge`);
  }
}

// ---------------------------------------------------------------------------------- interaction-session@1

export interface SessionFile {
  format: typeof INTERACTION_SESSION_FORMAT;
  version: typeof FORMAT_VERSION;
  challenge: DefinitionFile;
  source: SessionSource;
  context?: BehaviorContext;
  label?: string;
  tags?: string[];
  passed?: boolean;
  createdAt?: string;
  session: InteractionSession;
}

export interface ParsedSession {
  definition: ChallengeDefinition;
  source: SessionSource;
  context: BehaviorContext;
  label: string;
  tags: string[];
  passed?: boolean;
  session: InteractionSession;
}

export function toSessionFile(def: ChallengeDefinition, sample: { kind: "recorded" | "synthetic"; profile?: string; seed?: number; session: InteractionSession; context: BehaviorContext; label?: string; tags?: readonly string[]; passed?: boolean }, now: Date = new Date()): SessionFile {
  const source: SessionFile["source"] =
    sample.kind === "recorded"
      ? { kind: "recorded" }
      : { kind: "synthetic", profile: sample.profile ?? "", generator: SYNTHETIC_GENERATOR_VERSION, seed: sample.seed ?? 0 };
  const context = contextForExport(sample.context);
  return {
    format: INTERACTION_SESSION_FORMAT,
    version: FORMAT_VERSION,
    challenge: toDefinitionFile(def),
    source,
    ...(context === undefined ? {} : { context }),
    ...(sample.label ? { label: sample.label } : {}),
    ...(sample.tags && sample.tags.length > 0 ? { tags: [...sample.tags] } : {}),
    ...(sample.passed === undefined ? {} : { passed: sample.passed }),
    createdAt: now.toISOString(),
    session: sessionForExport(sample.session),
  };
}

function readSyntheticSource(v: unknown, path: string, captcha: BehaviorCaptchaId): SessionSource {
  const s = readObject(v, path, ["kind", "profile", "generator", "seed"]);
  if (s["kind"] !== "synthetic") throw new FormatError("invalid", `${path}.kind must be "synthetic"`);
  const profile = readString(s["profile"], `${path}.profile`, 40, /^[a-z-]+$/);
  if (!profileDef(captcha, profile)) throw new FormatError("invalid", `${path}.profile "${profile}" is not a profile of ${captcha}`);
  return { kind: "synthetic", profile, generator: readString(s["generator"], `${path}.generator`, 24, /^synthetic@[0-9]{1,3}$/), seed: readInt(s["seed"], `${path}.seed`, 0, 0xffffffff) };
}

export function readSessionFile(v: unknown): ParsedSession {
  const o = readObject(v, "file", ["format", "version", "challenge", "source", "session"], ["context", "label", "tags", "passed", "createdAt"]);
  if (o["format"] !== INTERACTION_SESSION_FORMAT) throw new FormatError("unsupported-format", `format must be "${INTERACTION_SESSION_FORMAT}"`);
  if (o["version"] !== FORMAT_VERSION) throw new FormatError("unsupported-version", `version ${String(o["version"])} (this app reads ${FORMAT_VERSION})`);
  const definition = readDefinitionFile(o["challenge"], "file.challenge");
  const srcObj = readObject(o["source"], "file.source", ["kind"], ["profile", "generator", "seed"]);
  let source: SessionFile["source"];
  if (srcObj["kind"] === "recorded") {
    readObject(o["source"], "file.source", ["kind"]);
    source = { kind: "recorded" };
  } else if (srcObj["kind"] === "synthetic") {
    const s = readObject(o["source"], "file.source", ["kind", "profile", "generator", "seed"]);
    const profile = readString(s["profile"], "file.source.profile", 40, /^[a-z-]+$/);
    if (!profileDef(definition.captcha, profile)) throw new FormatError("invalid", `file.source.profile "${profile}" is not a profile of ${definition.captcha}`);
    source = { kind: "synthetic", profile, generator: readString(s["generator"], "file.source.generator", 24, /^synthetic@[0-9]{1,3}$/), seed: readInt(s["seed"], "file.source.seed", 0, 0xffffffff) };
  } else {
    throw new FormatError("invalid", 'file.source.kind must be "recorded" or "synthetic"');
  }
  const session = readSession(o["session"], "file.session", definition.captcha);
  const context = readContext(o["context"], "file.context", definition.captcha);
  if (o["createdAt"] !== undefined && !ISO_TIME.test(readString(o["createdAt"], "file.createdAt", 40))) throw new FormatError("invalid", "file.createdAt must be an ISO time");
  const parsed: ParsedSession = {
    definition,
    source,
    context,
    label: o["label"] === undefined ? "" : readLabel(o["label"], "file.label"),
    tags: o["tags"] === undefined ? [] : readTags(o["tags"], "file.tags"),
    ...(o["passed"] === undefined ? {} : { passed: readBoolean(o["passed"], "file.passed") }),
    session,
  };
  checkMemoryContext(definition, session, context, source, "file");
  // It must be analysable against its own challenge; otherwise it cannot be used and is refused now.
  try {
    analyzeSession(definition.captcha, generateChallenge(definition), session, context);
  } catch (err) {
    throw new FormatError("incompatible", `file.session cannot be analysed against its challenge (${err instanceof Error ? err.message : "unknown error"})`);
  }
  return parsed;
}

// ----------------------------------------------------------------------------------- experiment-bundle@1

export interface BundleVersions {
  sessionSchema: number;
  signals: string;
  classifier: string;
  syntheticGenerator: string;
}

export const CURRENT_VERSIONS: BundleVersions = {
  sessionSchema: SCHEMA_VERSION,
  signals: BEHAVIOR_FEATURE_SET,
  classifier: CLASSIFIER_VERSION,
  syntheticGenerator: SYNTHETIC_GENERATOR_VERSION,
};

export interface BundleFile {
  format: typeof EXPERIMENT_BUNDLE_FORMAT;
  version: typeof FORMAT_VERSION;
  name: string;
  notes: string;
  createdAt: string;
  challenge: DefinitionFile;
  versions: BundleVersions;
  recorded: { id: string; label: string; tags: string[]; passed?: boolean; context?: BehaviorContext; source?: SessionSource; session: InteractionSession }[];
  synthetic: { id: string; profile: string; baseSeed: number; runs: number; context?: BehaviorContext }[];
  integrity: { algorithm: typeof INTEGRITY_ALGORITHM; value: string };
}

type BundleBody = Omit<BundleFile, "integrity">;

/** What the checksum covers: everything except the creation time, which is descriptive and changes on every export. */
function payloadOf(body: Record<string, unknown>): Record<string, unknown> {
  const { createdAt: _createdAt, ...rest } = body;
  void _createdAt;
  return rest;
}

export function toBundleFile(exp: Experiment, now: Date = new Date()): BundleFile {
  const body: BundleBody = {
    format: EXPERIMENT_BUNDLE_FORMAT,
    version: FORMAT_VERSION,
    name: exp.name,
    notes: exp.notes,
    createdAt: now.toISOString(),
    challenge: toDefinitionFile(exp.definition),
    versions: { ...CURRENT_VERSIONS },
    recorded: exp.recorded.map((r) => {
      const context = contextForExport(r.context);
      return {
        id: r.id,
        label: r.label,
        tags: [...r.tags],
        ...(r.passed === undefined ? {} : { passed: r.passed }),
        ...(context === undefined ? {} : { context }),
        ...(r.source.kind === "recorded" ? {} : { source: { ...r.source } }),
        session: sessionForExport(r.session),
      };
    }),
    synthetic: exp.synthetic.map((s) => {
      const context = contextForExport(s.context);
      return { id: s.id, profile: s.profile, baseSeed: s.baseSeed, runs: s.runs, ...(context === undefined ? {} : { context }) };
    }),
  };
  return { ...body, integrity: { algorithm: INTEGRITY_ALGORITHM, value: integrityOf(payloadOf(body)) } };
}

export interface ParsedBundle {
  experiment: Experiment;
  versions: BundleVersions;
  /** Human-readable cautions that do not stop the import. */
  warnings: string[];
}

const ID = /^[A-Za-z0-9_-]{1,40}$/;

export function readBundleFile(v: unknown): ParsedBundle {
  const o = readObject(v, "file", ["format", "version", "name", "notes", "createdAt", "challenge", "versions", "recorded", "synthetic", "integrity"]);
  if (o["format"] !== EXPERIMENT_BUNDLE_FORMAT) throw new FormatError("unsupported-format", `format must be "${EXPERIMENT_BUNDLE_FORMAT}"`);
  if (o["version"] !== FORMAT_VERSION) throw new FormatError("unsupported-version", `version ${String(o["version"])} (this app reads ${FORMAT_VERSION})`);
  const definition = readDefinitionFile(o["challenge"], "file.challenge");
  const ver = readObject(o["versions"], "file.versions", ["sessionSchema", "signals", "classifier", "syntheticGenerator"]);
  const versions: BundleVersions = {
    sessionSchema: readInt(ver["sessionSchema"], "file.versions.sessionSchema", 0, 1000),
    signals: readString(ver["signals"], "file.versions.signals", 40, /^[a-z-]+@[0-9]{1,3}$/),
    classifier: readString(ver["classifier"], "file.versions.classifier", 40, /^[a-z-]+@[0-9]{1,3}$/),
    syntheticGenerator: readString(ver["syntheticGenerator"], "file.versions.syntheticGenerator", 40, /^[a-z]+@[0-9]{1,3}$/),
  };
  if (versions.sessionSchema !== SCHEMA_VERSION) throw new FormatError("unsupported-version", `session schema ${versions.sessionSchema} (this app reads ${SCHEMA_VERSION})`);
  if (!ISO_TIME.test(readString(o["createdAt"], "file.createdAt", 40))) throw new FormatError("invalid", "file.createdAt must be an ISO time");

  const recordedRaw = readArray(o["recorded"], "file.recorded", MAX_RECORDED);
  const syntheticRaw = readArray(o["synthetic"], "file.synthetic", MAX_SYNTHETIC_SPECS);
  const ids = new Set<string>();
  let eventTotal = 0;
  const recorded: RecordedEntry[] = recordedRaw.map((raw, i) => {
    const path = `file.recorded[${i}]`;
    const r = readObject(raw, path, ["id", "label", "tags", "session"], ["passed", "context", "source"]);
    const id = readString(r["id"], `${path}.id`, 40, ID);
    if (ids.has(id) || id === RECORDED_COHORT) throw new FormatError("invalid", `${path}.id "${id}" is not unique`);
    ids.add(id);
    const context = readContext(r["context"], `${path}.context`, definition.captcha);
    const session = readSession(r["session"], `${path}.session`, definition.captcha);
    checkMemoryContext(definition, session, context, r["source"] === undefined ? { kind: "recorded" } : readSyntheticSource(r["source"], `${path}.source`, definition.captcha), path);
    eventTotal += session.events.length;
    if (eventTotal > MAX_EVENTS_TOTAL) throw new FormatError("too-large", `more than ${MAX_EVENTS_TOTAL} events in total`);
    try {
      analyzeSession(definition.captcha, generateChallenge(definition), session, context);
    } catch (err) {
      throw new FormatError("incompatible", `${path}.session cannot be analysed against the challenge (${err instanceof Error ? err.message : "unknown error"})`);
    }
    return {
      id,
      label: readLabel(r["label"], `${path}.label`),
      tags: readTags(r["tags"], `${path}.tags`),
      context,
      ...(r["passed"] === undefined ? {} : { passed: readBoolean(r["passed"], `${path}.passed`) }),
      session,
      imported: true,
      source: r["source"] === undefined ? { kind: "recorded" } : readSyntheticSource(r["source"], `${path}.source`, definition.captcha),
    };
  });

  let total = 0;
  const specIds = new Set<string>();
  const synthetic: SyntheticSpec[] = syntheticRaw.map((raw, i) => {
    const path = `file.synthetic[${i}]`;
    const s = readObject(raw, path, ["id", "profile", "baseSeed", "runs"], ["context"]);
    const id = readString(s["id"], `${path}.id`, 40, ID);
    if (specIds.has(id) || id === RECORDED_COHORT) throw new FormatError("invalid", `${path}.id "${id}" is not unique`);
    specIds.add(id);
    const profile = readString(s["profile"], `${path}.profile`, 40, /^[a-z-]+$/);
    if (!profileDef(definition.captcha, profile)) throw new FormatError("invalid", `${path}.profile "${profile}" is not a profile of ${definition.captcha}`);
    const runs = readInt(s["runs"], `${path}.runs`, 1, MAX_RUNS_PER_SPEC);
    total += runs;
    if (total > MAX_SYNTHETIC_TOTAL) throw new FormatError("too-large", `more than ${MAX_SYNTHETIC_TOTAL} synthetic runs in total`);
    return { id, profile, baseSeed: readInt(s["baseSeed"], `${path}.baseSeed`, 0, 0xffffffff), runs, context: readContext(s["context"], `${path}.context`, definition.captcha) };
  });

  const warnings: string[] = [];
  if (synthetic.length > 0 && versions.syntheticGenerator !== SYNTHETIC_GENERATOR_VERSION) {
    throw new FormatError("incompatible", `the batches were made with ${versions.syntheticGenerator} and cannot be reproduced by ${SYNTHETIC_GENERATOR_VERSION}`);
  }
  if (versions.signals !== BEHAVIOR_FEATURE_SET) warnings.push(`made with ${versions.signals}; this app computes ${BEHAVIOR_FEATURE_SET}`);
  if (versions.classifier !== CLASSIFIER_VERSION) warnings.push(`classified with ${versions.classifier}; this app uses ${CLASSIFIER_VERSION}`);

  const integrity = readObject(o["integrity"], "file.integrity", ["algorithm", "value"]);
  if (integrity["algorithm"] !== INTEGRITY_ALGORITHM) throw new FormatError("invalid", `file.integrity.algorithm must be "${INTEGRITY_ALGORITHM}"`);
  const expected = readString(integrity["value"], "file.integrity.value", 64, /^[0-9a-f]{64}$/);
  const { integrity: _ignored, ...body } = v as Record<string, unknown> & { integrity: unknown };
  void _ignored;
  if (integrityOf(payloadOf(body)) !== expected) warnings.push("the file was changed after it was exported (checksum mismatch); it was still read");

  return {
    experiment: {
      name: readText(o["name"], "file.name", 80),
      notes: readText(o["notes"], "file.notes", 5000),
      definition,
      recorded,
      synthetic,
    },
    versions,
    warnings,
  };
}

// ----------------------------------------------------------------------------------- experiment-summary@1

export interface SummaryFile {
  format: typeof EXPERIMENT_SUMMARY_FORMAT;
  version: typeof FORMAT_VERSION;
  name: string;
  createdAt: string;
  challenge: DefinitionFile;
  versions: BundleVersions;
  cohorts: {
    id: string;
    label: string;
    kind: "recorded" | "synthetic";
    count: number;
    /** Counts of classifier OUTPUTS. Not accuracy, not probabilities. */
    classifierOutputs: Record<"human-like" | "synthetic-like" | "uncertain", number>;
    signals: { signal: string; group: string; count: number; missing: number; min: number | null; max: number | null; mean: number | null; median: number | null }[];
  }[];
}

/** A compact, one-way description (counts and descriptive statistics). It cannot be imported back. */
export function toSummaryFile(exp: Experiment, samples: readonly Sample[], now: Date = new Date()): SummaryFile {
  return {
    format: EXPERIMENT_SUMMARY_FORMAT,
    version: FORMAT_VERSION,
    name: exp.name,
    createdAt: now.toISOString(),
    challenge: toDefinitionFile(exp.definition),
    versions: { ...CURRENT_VERSIONS },
    cohorts: cohortsOf(exp, samples).map((c) => ({
      id: c.id,
      label: c.label,
      kind: c.kind,
      count: c.samples.length,
      classifierOutputs: { ...labelCounts(c.samples) },
      signals: cohortSignalStats(c.samples, exp.definition.captcha),
    })),
  };
}

// ------------------------------------------------------------------------------------------- dispatcher

export type Imported =
  | { kind: "challenge"; definition: ChallengeDefinition }
  | { kind: "session"; parsed: ParsedSession }
  | { kind: "experiment"; parsed: ParsedBundle };

/** The `format` named in a file's text, after the same safety checks as a full import; null when there is none. */
export function peekFormat(text: string): string | null {
  const value = parseUntrustedJson(text);
  const format = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Rec)["format"] : undefined;
  return typeof format === "string" ? format : null;
}

/** Reads any importable file. Data only: nothing in it is ever evaluated. */
export function importText(text: string): Imported {
  const value = parseUntrustedJson(text);
  const rec = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Rec) : undefined;
  const format = rec?.["format"];
  const known = format === CHALLENGE_DEFINITION_FORMAT || format === INTERACTION_SESSION_FORMAT || format === EXPERIMENT_BUNDLE_FORMAT || format === EXPERIMENT_SUMMARY_FORMAT;
  // The version is judged before anything else is read, so a future or old file is named as such.
  if (known && rec?.["version"] !== FORMAT_VERSION) throw new FormatError("unsupported-version", `version ${String(rec?.["version"])} (this app reads ${FORMAT_VERSION})`);
  switch (format) {
    case CHALLENGE_DEFINITION_FORMAT:
      return { kind: "challenge", definition: readDefinitionFile(value, "file") };
    case INTERACTION_SESSION_FORMAT:
      return { kind: "session", parsed: readSessionFile(value) };
    case EXPERIMENT_BUNDLE_FORMAT:
      return { kind: "experiment", parsed: readBundleFile(value) };
    case EXPERIMENT_SUMMARY_FORMAT:
      throw new FormatError("unsupported-format", "an experiment summary is a one-way export and cannot be imported");
    default:
      throw new FormatError("unsupported-format", "the file is not a CaptchaLab challenge, session or experiment");
  }
}

/** Compatibility of a session file with the experiment it would join. */
export function sessionJoins(exp: Experiment, parsed: ParsedSession): void {
  if (!sameDefinition(exp.definition, parsed.definition)) {
    throw new FormatError("incompatible", "the session was recorded on a different challenge (CAPTCHA, variant, difficulty or seed differ)");
  }
}
