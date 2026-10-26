import type { Translate } from "@/lib/i18n";
import { ERROR_TEXT, FormatError, MAX_EXPORT_BYTES, MAX_IMPORT_BYTES } from "./safe";

/** The text of a file the user chose. The size is checked BEFORE reading so a huge file is never loaded. */
export async function readFileText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) throw new FormatError("too-large", `${(file.size / 1048576).toFixed(1)} MB (limit ${MAX_IMPORT_BYTES / 1048576} MB)`);
  return file.text();
}

/** Pretty JSON text for a download; refuses to build something larger than the export limit. */
export function jsonText(data: unknown): string {
  const text = JSON.stringify(data, null, 1);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_EXPORT_BYTES) throw new FormatError("too-large", `the export would be ${(bytes / 1048576).toFixed(1)} MB (limit ${MAX_EXPORT_BYTES / 1048576} MB)`);
  return text;
}

export function approxSize(text: string): string {
  return text.length < 1024 ? `${text.length} B` : text.length < 1048576 ? `${(text.length / 1024).toFixed(1)} KB` : `${(text.length / 1048576).toFixed(1)} MB`;
}

/**
 * Saves text as a file with a local Blob and an object URL: no request is made, nothing is stored, and the URL is
 * revoked straight away. `filename` must already be safe (see safeFilename).
 */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A readable message for any error from this module; other errors get a generic line (never a stack trace). */
export function describeError(err: unknown, t: Translate): string {
  if (err instanceof FormatError) {
    const [vi, en] = ERROR_TEXT[err.code];
    return `${t(vi, en)}: ${err.detail}`;
  }
  return t("Đã xảy ra lỗi không mong đợi.", "Something unexpected went wrong.");
}
