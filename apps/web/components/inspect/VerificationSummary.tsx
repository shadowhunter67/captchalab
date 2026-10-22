interface Props {
  passed: boolean;
  /** Plugin-provided explanation of the outcome. */
  reason: string;
  /** Overrides the default correctness-vs-behavior note. */
  note?: string;
}

const DEFAULT_NOTE =
  "Verification is based on the challenge answer. Behavioral metrics do not affect pass/fail in this demo.";

/** Pass/fail outcome with its reason. Status is conveyed by text and a symbol, not by color alone. */
export function VerificationSummary({ passed, reason, note = DEFAULT_NOTE }: Props) {
  return (
    <div role="status" aria-live="polite" data-testid="result" className="rounded-md border border-line p-3">
      <p className={`text-lg font-semibold ${passed ? "text-ok" : "text-bad"}`}>
        <span aria-hidden="true">{passed ? "✓ " : "✗ "}</span>
        Result: {passed ? "Passed" : "Not passed"}
      </p>
      <p className="mt-1 text-sm text-muted">{reason}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}
