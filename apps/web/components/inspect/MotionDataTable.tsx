"use client";

import { useMemo, useRef, useState } from "react";
import type { SeriesSample } from "@captchalab/captcha-core";
import { useT } from "@/lib/i18n";
import { formatMilliseconds } from "@/lib/format";
import { countValidSamples } from "@/lib/inspect/series";
import { DEFAULT_TABLE_ROWS, MAX_TABLE_ROWS, projectSeriesTable } from "@/lib/inspect/series-table";

interface Props {
  /** e.g. "Velocity"; used in the summary, caption and column header. */
  title: string;
  unit: string;
  /** The same segments the chart draws: one source of truth for both representations. */
  segments: readonly (readonly SeriesSample[])[];
  /** Formats one value together with its unit, e.g. "248.3 px/s". */
  formatCell: (value: number) => string;
  /** What one segment is called to a reader (e.g. "Drag"). */
  segmentLabel: string;
  /** Optional name per input segment (aligned with `segments`), e.g. "Circle · attempt 2". */
  segmentLabels?: readonly string[];
  testId: string;
}

/**
 * Text alternative to a chart: the same samples as a semantic <table>.
 *  - Collapsed by default; nothing is computed or rendered until opened (only a cheap count for the summary).
 *  - Long series are cut at DEFAULT_TABLE_ROWS with an explicit "Showing first N of M" notice;
 *    "Show all" is capped at MAX_TABLE_ROWS and also says so. The expanded state belongs to one
 *    dataset and resets when the data changes.
 *  - The first cell of each row is its row header ("Drag 2 · sample 5"), so every value is announced
 *    with the movement it belongs to. Each segment is its own <tbody>.
 */
export function MotionDataTable({ title, unit, segments, formatCell, segmentLabel, segmentLabels, testId }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // `showAllFor` remembers which dataset was expanded; a different `segments` shows the default view again.
  const [showAllFor, setShowAllFor] = useState<typeof segments | null>(null);
  const showAll = showAllFor === segments;
  const statusRef = useRef<HTMLParagraphElement>(null);

  const total = useMemo(() => countValidSamples(segments), [segments]);
  const table = useMemo(
    () => (open ? projectSeriesTable(segments, showAll ? MAX_TABLE_ROWS : DEFAULT_TABLE_ROWS) : null),
    [open, segments, showAll],
  );

  // Named by the ORIGINAL segment index, so "Attempt 3" here is line 3 in the chart and path 3 in the trajectory.
  const nameOf = (segmentIndex: number): string => segmentLabels?.[segmentIndex] ?? `${segmentLabel} ${segmentIndex + 1}`;
  const bySegment = new Map<number, NonNullable<typeof table>["rows"]>();
  for (const row of table?.rows ?? []) bySegment.set(row.segment, [...(bySegment.get(row.segment) ?? []), row]);

  const expand = (): void => {
    setShowAllFor(segments);
    // The button disappears; move focus to the status line so the change is announced and focus is not lost.
    queueMicrotask(() => statusRef.current?.focus());
  };

  return (
    <details
      className="mt-2 rounded-md border border-line p-2 text-sm"
      data-testid={`${testId}-data`}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer font-medium">
        {t(
          `Xem bảng dữ liệu ${title.toLowerCase()} (${total} mẫu)`,
          `Show ${title.toLowerCase()} data table (${total} sample${total === 1 ? "" : "s"})`,
        )}
      </summary>
      {table && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left" data-testid={`${testId}-table`}>
            <caption className="mb-1 text-left text-xs text-muted">
              {t(
                `Các mẫu ${title.toLowerCase()} trong biểu đồ phía trên, mỗi mẫu một dòng. Mỗi ${segmentLabel.toLowerCase()} là một chuyển động riêng; giá trị không được nối từ ${segmentLabel.toLowerCase()} này sang ${segmentLabel.toLowerCase()} kế tiếp.`,
                `${title} samples shown in the chart above, one row per sample. Each ${segmentLabel.toLowerCase()} is a separate movement; values are not connected from one ${segmentLabel.toLowerCase()} to the next.`,
              )}
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-1 pr-3 font-semibold">{segmentLabels ? t("Lần thử", "Attempt") : segmentLabel} · {t("mẫu", "sample")}</th>
                <th scope="col" className="py-1 pr-3 font-semibold">{t("Thời gian", "Time")}</th>
                <th scope="col" className="py-1 font-semibold">{title} ({unit})</th>
              </tr>
            </thead>
            {[...bySegment.entries()].map(([segment, rows]) => (
              <tbody key={segment} data-testid={`${testId}-segment`}>
                {rows.map((r) => (
                  <tr key={r.sample} className="border-b border-line last:border-b-0">
                    <th scope="row" className="py-1 pr-3 font-normal">
                      {nameOf(r.segmentIndex)} · {t("mẫu", "sample")} {r.sample}
                    </th>
                    <td className="py-1 pr-3 font-mono">{formatMilliseconds(r.t)}</td>
                    <td className="py-1 font-mono">{formatCell(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          <p
            ref={statusRef}
            tabIndex={-1}
            role="status"
            className="mt-2 text-xs text-muted"
            data-testid={`${testId}-truncated`}
          >
            {table.shown < table.total ? (
              <>
                {t(
                  `Đang hiện ${table.shown} mẫu đầu trong ${table.total} mẫu.`,
                  `Showing first ${table.shown} of ${table.total} samples.`,
                )}{" "}
                {!showAll && table.total <= MAX_TABLE_ROWS ? (
                  <button type="button" className="underline" onClick={expand}>
                    {t(`Hiện cả ${table.total} mẫu`, `Show all ${table.total} samples`)}
                  </button>
                ) : !showAll ? (
                  <button type="button" className="underline" onClick={expand}>
                    {t(`Hiện tối đa ${MAX_TABLE_ROWS} mẫu`, `Show up to ${MAX_TABLE_ROWS} samples`)}
                  </button>
                ) : (
                  t(`Bảng chỉ hiện tối đa ${MAX_TABLE_ROWS} dòng.`, `The table is limited to ${MAX_TABLE_ROWS} rows.`)
                )}
              </>
            ) : (
              t(`Đã hiện cả ${table.total} mẫu.`, `All ${table.total} samples shown.`)
            )}
          </p>
        </div>
      )}
    </details>
  );
}
