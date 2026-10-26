"use client";

import { formatSignal, signalLabel } from "@/lib/behavior/signal-catalog";
import { useT } from "@/lib/i18n";

export interface StripRow {
  id: string;
  label: string;
  values: readonly (number | null | undefined)[];
}

const W = 420;
const ROW = 34;
const LEFT = 150;
const PAD = 10;

/**
 * One dot per session on a shared scale, one row per cohort. Missing values (null) are not drawn and are counted
 * in the label, never drawn at zero. The stats table next to it carries the same numbers as text.
 */
export function CohortStrips({ signal, rows, testId }: { signal: string; rows: readonly StripRow[]; testId?: string }) {
  const t = useT();
  const all = rows.flatMap((r) => r.values).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const lo = all.length > 0 ? Math.min(...all) : 0;
  const hi = all.length > 0 ? Math.max(...all) : 1;
  const span = hi - lo || 1;
  const x = (v: number): number => LEFT + PAD + ((v - lo) / span) * (W - LEFT - 2 * PAD);
  const height = rows.length * ROW + 22;
  return (
    <svg
      role="img"
      aria-label={t(
        `${signalLabel(signal, t)}: một chấm cho mỗi phiên, từ ${formatSignal(signal, lo)} đến ${formatSignal(signal, hi)}`,
        `${signalLabel(signal, t)}: one dot per session, from ${formatSignal(signal, lo)} to ${formatSignal(signal, hi)}`,
      )}
      viewBox={`0 0 ${W} ${height}`}
      className="w-full max-w-2xl"
      data-testid={testId}
    >
      {rows.map((r, i) => {
        const y = i * ROW + ROW / 2;
        const present = r.values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        const missing = r.values.length - present.length;
        return (
          <g key={r.id}>
            <text x={0} y={y - 2} fontSize={10} fill="var(--fg)">{r.label.length > 26 ? `${r.label.slice(0, 25)}…` : r.label}</text>
            <text x={0} y={y + 10} fontSize={9} fill="var(--muted)">{`n=${present.length}${missing > 0 ? ` · ${t("thiếu", "missing")} ${missing}` : ""}`}</text>
            <line x1={LEFT + PAD} x2={W - PAD} y1={y} y2={y} stroke="var(--line)" />
            {present.map((v, k) => (
              <circle key={k} cx={x(v)} cy={y + ((k % 3) - 1) * 4} r={2.6} fill="var(--fg)" fillOpacity={0.55} aria-hidden="true" />
            ))}
          </g>
        );
      })}
      <text x={LEFT + PAD} y={height - 6} fontSize={9} fill="var(--muted)">{formatSignal(signal, lo)}</text>
      <text x={W - PAD} y={height - 6} fontSize={9} textAnchor="end" fill="var(--muted)">{formatSignal(signal, hi)}</text>
    </svg>
  );
}
