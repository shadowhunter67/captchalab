"use client";

import { Card } from "@/components/inspect/Card";
import { DISTRIBUTION_RUNS, type SignalSummary, type SyntheticDistribution } from "@/lib/behavior/reference";
import { formatSignal, signalLabel } from "@/lib/behavior/signal-catalog";
import type { BehavioralVector } from "@/lib/behavior/types";
import { profileName } from "@/lib/behavior/synthetic";
import { useT } from "@/lib/i18n";

const W = 240;
const H = 34;
const PAD = 8;

function Strip({ s, human, label }: { s: SignalSummary; human: number | null; label: string }) {
  if (s.min === null || s.max === null) return null;
  const lo = Math.min(s.min, human ?? s.min);
  const hi = Math.max(s.max, human ?? s.max);
  const span = hi - lo || 1;
  const x = (v: number): number => PAD + ((v - lo) / span) * (W - 2 * PAD);
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs" style={{ aspectRatio: `${W} / ${H}` }}>
      <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} stroke="var(--line)" />
      {s.values.map((v, i) => (
        <circle key={i} cx={x(v)} cy={H / 2 + ((i % 3) - 1) * 5} r={2.5} fill="var(--muted)" fillOpacity={0.6} aria-hidden="true" />
      ))}
      {human !== null && <path d={`M${x(human)} 3V${H - 3}`} stroke="var(--fg)" strokeWidth={2} aria-hidden="true" />}
    </svg>
  );
}

interface Props {
  distribution: SyntheticDistribution | null;
  human: BehavioralVector | null;
  onGenerate: () => void;
}

/**
 * A generated synthetic reference distribution: the same challenge run many times with consecutive seeds.
 * It describes the GENERATOR. It is not a distribution of people, and one human sample is a single point.
 */
export function DistributionPanel({ distribution, human, onGenerate }: Props) {
  const t = useT();
  return (
    <Card id="distribution-h" title={t("Phân bố tham chiếu mô phỏng được sinh ra", "Generated synthetic reference distribution")}>
      <p className="mb-3 text-sm text-muted">
        {t(
          `Chạy cùng một thử thách ${DISTRIBUTION_RUNS} lần với các seed liên tiếp cho mẫu mô phỏng đã chọn. Đây là dữ liệu do bộ sinh tạo ra, không phải phân bố của con người; mẫu của bạn chỉ là một điểm đơn lẻ.`,
          `Runs the same challenge ${DISTRIBUTION_RUNS} times with consecutive seeds for the chosen synthetic profile. This is generator output, not a distribution of people; your sample is a single point.`,
        )}
      </p>
      <button type="button" data-testid="distribution-generate" onClick={onGenerate} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
        {t("Sinh phân bố mô phỏng", "Generate synthetic distribution")}
      </button>
      {distribution && (
        <div className="mt-4 space-y-3" data-testid="distribution">
          <p className="text-xs text-muted">
            {t("Mẫu mô phỏng", "Synthetic profile")}: {profileName(distribution.captchaId, distribution.profile, t)} · {distribution.runs} {t("lần chạy", "runs")} · seed {distribution.baseSeed}–{distribution.baseSeed + distribution.runs - 1}
          </p>
          {!distribution.varies && (
            <p className="text-sm text-muted" data-testid="distribution-constant">
              {t("Mẫu này không dùng yếu tố ngẫu nhiên nên mọi lần chạy giống hệt nhau.", "This profile uses no randomness, so every run is identical.")}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t("Tóm tắt phân bố mô phỏng theo từng tín hiệu", "Summary of the synthetic distribution per signal")}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Nhỏ nhất", "Min")}</th>
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Trung vị", "Median")}</th>
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Lớn nhất", "Max")}</th>
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Mẫu người", "Human sample")}</th>
                  <th scope="col" className="py-1 font-medium">{t("Biểu đồ", "Chart")}</th>
                </tr>
              </thead>
              <tbody>
                {distribution.signals.map((s) => {
                  const h = human?.values[s.signal] ?? null;
                  return (
                    <tr key={s.signal} className="border-b border-line/50" data-testid={`dist-${s.signal}`}>
                      <th scope="row" className="py-1 pr-3 font-normal">{signalLabel(s.signal, t)}</th>
                      <td className="py-1 pr-3 font-mono">{formatSignal(s.signal, s.min)}</td>
                      <td className="py-1 pr-3 font-mono">{formatSignal(s.signal, s.median)}</td>
                      <td className="py-1 pr-3 font-mono">{formatSignal(s.signal, s.max)}</td>
                      <td className="py-1 pr-3 font-mono">{formatSignal(s.signal, h)}</td>
                      <td className="py-1">
                        <Strip s={s} human={h} label={t(`${signalLabel(s.signal, t)}: các lần chạy mô phỏng và mẫu người`, `${signalLabel(s.signal, t)}: synthetic runs and the human sample`)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">{t("Chấm xám: một lần chạy mô phỏng. Vạch đậm: mẫu người của bạn (nếu có).", "Grey dot: one synthetic run. Dark bar: your human sample (if any).")}</p>
        </div>
      )}
    </Card>
  );
}
