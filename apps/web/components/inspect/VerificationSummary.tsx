"use client";

import { useT } from "@/lib/i18n";
import { translateReason } from "@/lib/i18n/reasons";

interface Props {
  passed: boolean;
  /** Plugin-provided explanation of the outcome. */
  reason: string;
  /** Overrides the default correctness-vs-behavior note. */
  note?: string;
}

const DEFAULT_NOTE_EN =
  "Verification is based on the challenge answer. Behavioral metrics do not affect pass/fail in this demo.";
const DEFAULT_NOTE_VI =
  "Việc xác minh chỉ dựa trên câu trả lời của thử thách. Trong bản demo này, các chỉ số hành vi không ảnh hưởng đến kết quả đạt hay chưa đạt.";

/** Pass/fail outcome with its reason. Status is conveyed by text and a symbol, not by color alone. */
export function VerificationSummary({ passed, reason, note }: Props) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" data-testid="result" className="rounded-md border border-line p-3">
      <p className={`text-lg font-semibold ${passed ? "text-ok" : "text-bad"}`}>
        <span aria-hidden="true">{passed ? "✓ " : "✗ "}</span>
        {t("Kết quả", "Result")}: {passed ? t("Đạt", "Passed") : t("Chưa đạt", "Not passed")}
      </p>
      <p className="mt-1 text-sm text-muted">{translateReason(reason, t)}</p>
      <p className="mt-1 text-xs text-muted">{note ?? t(DEFAULT_NOTE_VI, DEFAULT_NOTE_EN)}</p>
    </div>
  );
}
