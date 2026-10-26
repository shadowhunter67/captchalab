import { sha256Hex } from "@captchalab/captcha-plugins";

/**
 * Limits for imported files (all untrusted). Chosen so a research bundle of about a hundred recorded sessions fits,
 * while a hostile file cannot make the page parse or walk an unbounded amount of data.
 */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_EXPORT_BYTES = 25 * 1024 * 1024;
export const MAX_JSON_DEPTH = 16;
export const MAX_JSON_NODES = 2_000_000;
/** Events across every session of one bundle. */
export const MAX_EVENTS_TOTAL = 150_000;
export const MAX_STRING_LENGTH = 20_000;
export const MAX_EVENTS_PER_SESSION = 20_000;
export const MAX_RECORDED = 100;
export const MAX_SYNTHETIC_SPECS = 12;
export const MAX_RUNS_PER_SPEC = 100;
export const MAX_SYNTHETIC_TOTAL = 300;
/** Above this many sessions the charts draw only the first MAX_DRAWN. */
export const MAX_DRAWN = 24;

export type FormatErrorCode =
  | "too-large"
  | "invalid-json"
  | "too-deep"
  | "forbidden-key"
  | "unsupported-format"
  | "unsupported-version"
  | "invalid"
  | "incompatible";

/** A user-facing import/validation failure. `detail` is a short English technical note (a path and a reason). */
export class FormatError extends Error {
  readonly code: FormatErrorCode;
  readonly detail: string;
  constructor(code: FormatErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "FormatError";
    this.code = code;
    this.detail = detail;
  }
}

export const ERROR_TEXT: Readonly<Record<FormatErrorCode, readonly [string, string]>> = {
  "too-large": ["Tệp quá lớn", "The file is too large"],
  "invalid-json": ["Tệp không phải JSON hợp lệ", "The file is not valid JSON"],
  "too-deep": ["Dữ liệu lồng nhau quá sâu", "The data is nested too deeply"],
  "forbidden-key": ["Tệp chứa khoá không được phép", "The file contains a forbidden key"],
  "unsupported-format": ["Định dạng tệp không được hỗ trợ", "Unsupported file format"],
  "unsupported-version": ["Phiên bản định dạng không được hỗ trợ", "Unsupported format version"],
  invalid: ["Nội dung tệp không hợp lệ", "The file content is invalid"],
  incompatible: ["Nội dung không tương thích", "The content is not compatible"],
};

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Parses text as JSON and walks the result once, iteratively (no recursion), to bound its depth, node count and
 * string length and to reject keys that could be used for prototype pollution. Pure data comes out; nothing is
 * evaluated, merged or assigned onto an existing object.
 */
/**
 * A single pass over the TEXT before it is parsed: bounds the nesting and the number of values so that JSON.parse
 * itself can neither recurse deeply nor allocate millions of values for a hostile file.
 */
function prescan(text: string): void {
  let depth = 0;
  let tokens = 1;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 92) i++; // backslash: skip the escaped character
      else if (c === 34) inString = false;
      continue;
    }
    if (c === 34) inString = true;
    else if (c === 91 || c === 123) {
      if (++depth > MAX_JSON_DEPTH) throw new FormatError("too-deep", `nesting is deeper than ${MAX_JSON_DEPTH}`);
      tokens++;
    } else if (c === 93 || c === 125) depth--;
    else if (c === 44) {
      if (++tokens > MAX_JSON_NODES) throw new FormatError("too-large", "too many values");
    }
  }
}

export function parseUntrustedJson(text: string): unknown {
  if (text.length > MAX_IMPORT_BYTES) throw new FormatError("too-large", `more than ${MAX_IMPORT_BYTES} characters`);
  prescan(text);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    // Extremely deep nesting makes JSON.parse itself throw a RangeError.
    if (err instanceof RangeError) throw new FormatError("too-deep", "nesting exceeds the parser limit");
    throw new FormatError("invalid-json", "the text could not be parsed");
  }
  // Only containers are queued (their children are checked in place), so memory use stays proportional to them.
  const stack: object[] = [];
  const depths: number[] = [];
  let nodes = 0;
  const visit = (v: unknown, d: number): void => {
    if (++nodes > MAX_JSON_NODES) throw new FormatError("too-large", "too many values");
    if (typeof v === "string") {
      if (v.length > MAX_STRING_LENGTH) throw new FormatError("too-large", "a string is too long");
    } else if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new FormatError("invalid", "a number is not finite");
    } else if (typeof v === "object" && v !== null) {
      if (d > MAX_JSON_DEPTH) throw new FormatError("too-deep", `nesting is deeper than ${MAX_JSON_DEPTH}`);
      stack.push(v);
      depths.push(d);
    }
  };
  visit(value, 1);
  while (stack.length > 0) {
    const v = stack.pop() as object;
    const d = depths.pop() as number;
    if (Array.isArray(v)) {
      for (const item of v as unknown[]) visit(item, d + 1);
    } else {
      for (const key of Object.keys(v)) {
        if (FORBIDDEN_KEYS.has(key)) throw new FormatError("forbidden-key", `key "${key}" is not allowed`);
        visit((v as Record<string, unknown>)[key], d + 1);
      }
    }
  }
  return value;
}

// ------------------------------------------------------------------------------------------ strict readers

export type Rec = Readonly<Record<string, unknown>>;

const bad = (path: string, why: string): never => {
  throw new FormatError("invalid", `${path}: ${why}`);
};

/** A plain object whose keys are all in `required` or `optional`, and which has every `required` key. */
export function readObject(v: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Rec {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return bad(path, "expected an object");
  const o = v as Rec;
  for (const key of Object.keys(o)) if (!required.includes(key) && !optional.includes(key)) bad(path, `unknown field "${key}"`);
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(o, key)) bad(path, `missing field "${key}"`);
  return o;
}

export function readString(v: unknown, path: string, maxLength: number, pattern?: RegExp): string {
  if (typeof v !== "string") return bad(path, "expected a string");
  if (v.length > maxLength) return bad(path, `longer than ${maxLength} characters`);
  if (pattern && !pattern.test(v)) return bad(path, "unexpected characters");
  return v;
}

export function readNumber(v: unknown, path: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return bad(path, "expected a finite number");
  if (v < min || v > max) return bad(path, `must be between ${min} and ${max}`);
  return v;
}

export function readInt(v: unknown, path: string, min: number, max: number): number {
  const n = readNumber(v, path, min, max);
  if (!Number.isInteger(n)) return bad(path, "expected an integer");
  return n;
}

export function readArray(v: unknown, path: string, maxLength: number): readonly unknown[] {
  if (!Array.isArray(v)) return bad(path, "expected an array");
  if (v.length > maxLength) return bad(path, `more than ${maxLength} items`);
  return v as readonly unknown[];
}

export function readBoolean(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") return bad(path, "expected true or false");
  return v;
}

/** Plain text only: no control characters other than newline and tab. Rendered as text by React, never as HTML. */
export function readText(v: unknown, path: string, maxLength: number): string {
  const s = readString(v, path, maxLength);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s)) return bad(path, "contains control characters");
  return s;
}

// ------------------------------------------------------------------------------------ canonical form / integrity

/** JSON with object keys sorted at every level, so the same data always serializes to the same text. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Cannot serialize a non-finite number");
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(",")}]`;
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

export const INTEGRITY_ALGORITHM = "sha256-canonical-json" as const;

/** A checksum of the canonical payload. It detects accidental edits; it is not a signature and proves no origin. */
export function integrityOf(payload: unknown): string {
  return sha256Hex(canonicalJson(payload));
}

/** `captchalab-<kind>-<part>.json` with every part reduced to [a-z0-9-]: no path separators, no dots, no spaces. */
export function safeFilename(kind: string, ...parts: (string | number | undefined)[]): string {
  const clean = (s: string): string =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  const tail = parts.map((p) => clean(String(p ?? ""))).filter((p) => p.length > 0);
  return ["captchalab", clean(kind), ...tail].join("-") + ".json";
}
