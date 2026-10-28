import { isKeyEvent, type InteractionEvent, type InteractionSession } from "@captchalab/captcha-core";
import { BEHAVIOR_FEATURE_SET, SYNTHETIC_GENERATOR_VERSION, type BehaviorContext } from "@/lib/behavior/types";
import { CLASSIFIER_VERSION } from "@/lib/behavior/classifier";
import { generateSyntheticSample, profileDef } from "@/lib/behavior/synthetic";
import { generateChallenge, readDefinitionFile, toDefinitionFile, type ChallengeDefinition, type DefinitionFile } from "@/lib/research/definition";
import { checkMemoryContext, readContext, readSession, type SessionFile } from "@/lib/research/formats";
import {
  FormatError,
  canonicalJson,
  parseUntrustedJson,
  readArray,
  readBoolean,
  readInt,
  readObject,
  readString,
  readText,
  type Rec,
} from "@/lib/research/safe";
import {
  DATASET_SCHEMA,
  DATASET_VERSION,
  MAX_DATASET_EVENTS,
  MAX_DATASET_RECORDS,
  analyzeRecord,
  eventsIn,
  freeId,
  isLabel,
  isRecordId,
  type DatasetRecord,
  type GroundTruthLabel,
  type ImportedClaims,
  type RecordSource,
} from "./records";

/**
 * captchalab-labeled-dataset@1. Strict like the other formats: an unknown field is an error and another version is
 * rejected, never reinterpreted. The file carries, per record: the challenge (a challenge-definition@1), the source,
 * the user-provided label, the session and — as information only — the signals and classifier reading the exporting
 * app had. On import the signals and the classifier reading are ALWAYS recomputed; the label is never recomputed.
 */
export interface DatasetRecordFile {
  schemaVersion: 1;
  id: string;
  challenge: DefinitionFile;
  source: { type: "recorded" | "synthetic"; synthetic?: { profile: string; generator: string; seed: number } };
  label: GroundTruthLabel;
  context?: BehaviorContext;
  passed?: boolean;
  note?: string;
  session: SessionFile["session"];
  features: { version: string; sourceSchema: string; values: Record<string, number | null> };
  classifier: { version: string; result: string };
}

export interface DatasetFile {
  schema: typeof DATASET_SCHEMA;
  version: typeof DATASET_VERSION;
  records: DatasetRecordFile[];
}

/** One event with its fields in a fixed order, so the same data always serializes to the same text. */
function orderedEvent(e: InteractionEvent): InteractionEvent {
  if (isKeyEvent(e)) return { t: e.t, type: e.type, code: e.code, ...(e.target === undefined ? {} : { target: e.target }) };
  return {
    t: e.t,
    type: e.type,
    x: e.x,
    y: e.y,
    pointerId: e.pointerId,
    pointerType: e.pointerType,
    ...(e.pressure === undefined ? {} : { pressure: e.pressure }),
    ...(e.target === undefined ? {} : { target: e.target }),
  };
}

export function toDatasetFile(records: readonly DatasetRecord[]): DatasetFile {
  return {
    schema: DATASET_SCHEMA,
    version: DATASET_VERSION,
    records: records.map((r) => {
      const a = analyzeRecord(r);
      const context = r.context === undefined ? undefined : (JSON.parse(JSON.stringify(r.context)) as BehaviorContext);
      return {
        schemaVersion: 1 as const,
        id: r.id,
        challenge: toDefinitionFile(r.definition),
        source: r.source.type === "synthetic" && r.source.synthetic ? { type: "synthetic" as const, synthetic: { ...r.source.synthetic } } : { type: r.source.type },
        label: r.label,
        ...(context === undefined ? {} : { context }),
        ...(r.passed === undefined ? {} : { passed: r.passed }),
        ...(r.note ? { note: r.note } : {}),
        // The wall-clock start of the interaction is not exported: analysis never uses it.
        session: {
          schemaVersion: r.session.schemaVersion,
          id: r.session.id,
          captchaId: r.session.captchaId,
          startedAt: 0,
          durationMs: r.session.durationMs,
          events: r.session.events.map(orderedEvent),
          inputModality: r.session.inputModality,
        },
        features: { version: a.vector.featureSetVersion, sourceSchema: a.vector.sourceSchema, values: { ...a.vector.values } },
        classifier: { version: CLASSIFIER_VERSION, result: a.classification.label },
      };
    }),
  };
}

export interface Rejected {
  /** Position in the file. */
  index: number;
  id: string | null;
  reason: string;
}

export interface DatasetImport {
  /** The current dataset plus every accepted record, in file order. */
  records: DatasetRecord[];
  imported: number;
  rejected: Rejected[];
  /** Records whose id was already taken and got a new local one. */
  renamed: { from: string; to: string }[];
  /** Records whose own signals or classifier reading differed from what the file claimed. */
  differing: { id: string; what: "features" | "classifier" }[];
  warnings: string[];
}

const VERSION_TEXT = /^[a-z0-9-]+@[0-9]{1,3}$/;

function readClaims(o: Rec, path: string): ImportedClaims {
  const f = readObject(o["features"], `${path}.features`, ["version", "sourceSchema", "values"]);
  const valuesRaw = f["values"];
  if (typeof valuesRaw !== "object" || valuesRaw === null || Array.isArray(valuesRaw)) throw new FormatError("invalid", `${path}.features.values: expected an object`);
  const keys = Object.keys(valuesRaw);
  if (keys.length > 64) throw new FormatError("invalid", `${path}.features.values: more than 64 entries`);
  const values: Record<string, number | null> = {};
  for (const k of keys) {
    const v = (valuesRaw as Record<string, unknown>)[k];
    if (!/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(k)) throw new FormatError("invalid", `${path}.features.values: key "${k}" has unexpected characters`);
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) throw new FormatError("invalid", `${path}.features.values.${k}: expected a finite number or null`);
    values[k] = v;
  }
  const claims: ImportedClaims = {
    features: { version: readString(f["version"], `${path}.features.version`, 40, VERSION_TEXT), sourceSchema: readString(f["sourceSchema"], `${path}.features.sourceSchema`, 60, /^[A-Za-z0-9@;.-]+$/), values },
  };
  if (o["classifier"] !== undefined) {
    const c = readObject(o["classifier"], `${path}.classifier`, ["version", "result"]);
    const result = readString(c["result"], `${path}.classifier.result`, 20);
    if (!["human-like", "synthetic-like", "uncertain"].includes(result)) throw new FormatError("invalid", `${path}.classifier.result: unknown output`);
    claims.classifier = { version: readString(c["version"], `${path}.classifier.version`, 40, VERSION_TEXT), result };
  }
  return claims;
}

interface ParsedRecord {
  record: DatasetRecord;
  differing: ("features" | "classifier")[];
  warning?: string;
}

/**
 * A session claiming current-generator provenance must be exactly what the generator makes (true = checked); another
 * generator version cannot be regenerated (false = unchecked). A mismatch throws.
 */
export function verifySyntheticProvenance(definition: ChallengeDefinition, session: InteractionSession, context: BehaviorContext, provenance: { profile: string; generator: string; seed: number }, path: string): boolean {
  if (provenance.generator !== SYNTHETIC_GENERATOR_VERSION) return false;
  const regenerated = generateSyntheticSample({ captchaId: definition.captcha, profile: provenance.profile, challenge: generateChallenge(definition), context, seed: provenance.seed });
  const same = (x: { events: unknown; durationMs: number; inputModality: string }) => canonicalJson({ events: x.events, durationMs: x.durationMs, inputModality: x.inputModality });
  if (same(regenerated.session) !== same(session)) throw new FormatError("invalid", `Synthetic provenance inconsistent: ${path}.session is not what ${provenance.generator} makes for this challenge, profile and seed`);
  return true;
}

function readRecord(raw: unknown, path: string): ParsedRecord {
  const o = readObject(raw, path, ["schemaVersion", "id", "challenge", "source", "label", "session", "features"], ["context", "passed", "note", "classifier"]);
  if (o["schemaVersion"] !== 1) throw new FormatError("unsupported-version", `${path}.schemaVersion ${String(o["schemaVersion"])} (this app reads 1)`);
  const id = readString(o["id"], `${path}.id`, 40);
  if (!isRecordId(id)) throw new FormatError("invalid", `${path}.id: unexpected characters`);
  if (!isLabel(o["label"])) throw new FormatError("invalid", `${path}.label: must be human, synthetic or unknown`);
  const label = o["label"];
  const definition = readDefinitionFile(o["challenge"], `${path}.challenge`);

  const s = readObject(o["source"], `${path}.source`, ["type"], ["synthetic"]);
  const type = s["type"];
  if (type !== "recorded" && type !== "synthetic") throw new FormatError("invalid", `${path}.source.type: must be recorded or synthetic`);
  let source: RecordSource;
  let provenance: { profile: string; generator: string; seed: number } | undefined;
  if (type === "synthetic") {
    if (s["synthetic"] === undefined) throw new FormatError("invalid", `${path}.source: a synthetic record needs its synthetic provenance`);
    const p = readObject(s["synthetic"], `${path}.source.synthetic`, ["profile", "generator", "seed"]);
    const profile = readString(p["profile"], `${path}.source.synthetic.profile`, 40, /^[a-z-]+$/);
    if (!profileDef(definition.captcha, profile)) throw new FormatError("invalid", `Synthetic provenance inconsistent: ${path}.source.synthetic.profile "${profile}" is not a profile of ${definition.captcha}`);
    provenance = { profile, generator: readString(p["generator"], `${path}.source.synthetic.generator`, 24, /^synthetic@[0-9]{1,3}$/), seed: readInt(p["seed"], `${path}.source.synthetic.seed`, 0, 0xffffffff) };
    source = { type: "synthetic", imported: true, synthetic: provenance };
  } else {
    if (s["synthetic"] !== undefined) throw new FormatError("invalid", `${path}.source: a recorded record cannot carry synthetic provenance`);
    source = { type: "recorded", imported: true };
  }

  const session = readSession(o["session"], `${path}.session`, definition.captcha);
  const context = readContext(o["context"], `${path}.context`, definition.captcha);
  // Same recall-clock hardening as every other import: the dataset cannot bypass it.
  checkMemoryContext(definition, session, context, provenance ? { kind: "synthetic", ...provenance } : { kind: "recorded" }, path);

  let warning: string | undefined;
  if (provenance) {
    const checked = verifySyntheticProvenance(definition, session, context, provenance, path);
    if (checked && label === "human") throw new FormatError("invalid", `${path}.label: "human" contradicts a session that CaptchaLab regenerates exactly (synthetic provenance)`);
    source = { ...source, provenanceChecked: checked };
    if (!checked) warning = `${path}: made with ${provenance.generator}, which this app cannot regenerate, so its synthetic provenance was not checked`;
  }

  const claims = readClaims(o, path);
  const note = o["note"] === undefined ? "" : readText(o["note"], `${path}.note`, 200);
  const record: DatasetRecord = {
    id,
    definition,
    source,
    label,
    context,
    ...(o["passed"] === undefined ? {} : { passed: readBoolean(o["passed"], `${path}.passed`) }),
    note,
    session,
    claims,
  };

  // Nothing the file says about signals or the classifier is trusted: both are recomputed here.
  const differing: ("features" | "classifier")[] = [];
  let current;
  try {
    current = analyzeRecord(record);
  } catch (err) {
    throw new FormatError("incompatible", `${path}.session cannot be analysed against its challenge (${err instanceof Error ? err.message : "unknown error"})`);
  }
  if (claims.features?.version === BEHAVIOR_FEATURE_SET && canonicalJson(claims.features.values) !== canonicalJson(current.vector.values)) differing.push("features");
  if (claims.classifier?.version === CLASSIFIER_VERSION && claims.classifier.result !== current.classification.label) differing.push("classifier");
  return { record, differing, ...(warning ? { warning } : {}) };
}

/**
 * Reads a dataset file and appends its valid records to `existing`. The envelope is all-or-nothing (a wrong schema,
 * version, size or hostile structure rejects the file). Records are judged one by one: valid ones are imported and the
 * rest are reported with a reason. A record whose id is taken gets a new local id; nothing is overwritten.
 */
export function importDataset(text: string, existing: readonly DatasetRecord[]): DatasetImport {
  const value = parseUntrustedJson(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new FormatError("unsupported-format", "the file is not a CaptchaLab labeled dataset");
  const rec = value as Rec;
  if (rec["schema"] !== DATASET_SCHEMA) throw new FormatError("unsupported-format", `schema must be "${DATASET_SCHEMA}"`);
  if (rec["version"] !== DATASET_VERSION) throw new FormatError("unsupported-version", `dataset version ${String(rec["version"])} (this app reads ${DATASET_VERSION})`);
  const env = readObject(value, "file", ["schema", "version", "records"], ["createdAt"]);
  const items = readArray(env["records"], "file.records", MAX_DATASET_RECORDS);

  const records = [...existing];
  const rejected: Rejected[] = [];
  const renamed: { from: string; to: string }[] = [];
  const differing: DatasetImport["differing"] = [];
  const warnings: string[] = [];
  let imported = 0;
  items.forEach((raw, index) => {
    const idGuess = typeof raw === "object" && raw !== null && typeof (raw as Rec)["id"] === "string" ? ((raw as Rec)["id"] as string).slice(0, 40) : null;
    try {
      if (records.length >= MAX_DATASET_RECORDS) throw new FormatError("too-large", `the dataset is full (${MAX_DATASET_RECORDS} records)`);
      const parsed = readRecord(raw, `records[${index}]`);
      if (eventsIn(records) + parsed.record.session.events.length > MAX_DATASET_EVENTS) throw new FormatError("too-large", `the dataset would hold more than ${MAX_DATASET_EVENTS} events`);
      let r = parsed.record;
      if (records.some((x) => x.id === r.id)) {
        const to = freeId(records);
        renamed.push({ from: r.id, to });
        r = { ...r, id: to };
      }
      records.push(r);
      imported++;
      for (const what of parsed.differing) differing.push({ id: r.id, what });
      if (parsed.warning) warnings.push(parsed.warning);
    } catch (err) {
      rejected.push({ index, id: idGuess, reason: err instanceof FormatError ? err.detail : "unexpected error" });
    }
  });
  return { records, imported, rejected, renamed, differing, warnings };
}
