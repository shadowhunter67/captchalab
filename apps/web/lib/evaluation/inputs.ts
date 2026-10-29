import type { DatasetRecord, RecordAnalysis } from "@/lib/dataset/records";
import type { EvalInput } from "./evaluate";

/**
 * Pairs each record's person-given label with the classifier's reading of the same session. The two stay separate
 * fields all the way: the label is copied from the record, the output from the analysis, never one from the other.
 * A record that could not be analysed is left out (it has no reading to compare).
 */
export function toEvalInputs(records: readonly DatasetRecord[], analyses: ReadonlyMap<string, RecordAnalysis>): EvalInput[] {
  const out: EvalInput[] = [];
  for (const r of records) {
    const a = analyses.get(r.id);
    if (!a) continue;
    out.push({
      id: r.id,
      label: r.label,
      captcha: r.definition.captcha,
      variant: r.definition.variant,
      difficulty: r.definition.difficulty,
      balance: a.classification.balance,
      output: a.classification.label,
    });
  }
  return out;
}
