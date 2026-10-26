"use client";

import { useMemo } from "react";
import { signalRows } from "@/lib/behavior/compare";
import { groupLabel } from "@/lib/behavior/signal-catalog";
import type { BehavioralVector, LabTaskId, SignalGroup } from "@/lib/behavior/types";
import { SIGNAL_GROUPS } from "@/lib/behavior/types";
import { useT } from "@/lib/i18n";

interface Props {
  captchaId: LabTaskId;
  human: BehavioralVector | null;
  synthetic: BehavioralVector | null;
  /** e.g. "Noisy" */
  syntheticName: string;
}

/**
 * Human vs synthetic signals, grouped (Timing, Motion, Correction, Rhythm, Attempts). A semantic table; the
 * difference column is a signed number with no colour, because a difference is not a verdict.
 */
export function SignalTable({ captchaId, human, synthetic, syntheticName }: Props) {
  const t = useT();
  const rows = useMemo(() => signalRows(human, synthetic, captchaId, t), [human, synthetic, captchaId, t]);
  const groups = SIGNAL_GROUPS.filter((g) => rows.some((r) => r.group === g));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" data-testid="compare-table">
        <caption className="sr-only">{t("Các tín hiệu đo được của mẫu người và mẫu mô phỏng", "Measured signals of the human sample and the synthetic sample")}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
            <th scope="col" className="py-1 pr-3 font-medium">{t("Người", "Human")}</th>
            <th scope="col" className="py-1 pr-3 font-medium">{t("Mô phỏng", "Synthetic")} ({syntheticName})</th>
            <th scope="col" className="py-1 font-medium">{t("Mô phỏng trừ người", "Synthetic minus human")}</th>
          </tr>
        </thead>
        {groups.map((g: SignalGroup) => (
          <tbody key={g} data-testid={`group-${g}`}>
            <tr>
              <th scope="colgroup" colSpan={4} className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
                {groupLabel(g, t)}
              </th>
            </tr>
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <tr key={r.id} className="border-b border-line/50" data-testid={`row-${r.id}`}>
                  <th scope="row" className="py-1 pr-3 font-normal" title={r.description}>{r.label}</th>
                  <td className="py-1 pr-3 font-mono" data-testid={`human-${r.id}`}>{r.human}</td>
                  <td className="py-1 pr-3 font-mono" data-testid={`synthetic-${r.id}`}>{r.synthetic}</td>
                  <td className="py-1 font-mono" data-testid={`diff-${r.id}`}>{r.difference ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        ))}
        <tbody>
          <tr>
            <th scope="colgroup" colSpan={4} className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{groupLabel("input", t)}</th>
          </tr>
          <tr className="border-b border-line/50" data-testid="row-input">
            <th scope="row" className="py-1 pr-3 font-normal">{t("Thiết bị nhập", "Input modality")}</th>
            <td className="py-1 pr-3 font-mono" data-testid="human-input">{human?.inputModality ?? "—"}</td>
            <td className="py-1 pr-3 font-mono" data-testid="synthetic-input">{synthetic?.inputModality ?? "—"}</td>
            <td className="py-1 font-mono">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
