import { formatMilliseconds, formatPixels } from "@/lib/format";
import type { AttemptRow } from "./drag-drop-view-data";

/** Semantic table of every drag attempt (item, outcome in words, duration, release error). */
export function AttemptsTable({ rows }: { rows: readonly AttemptRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No drag was recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" data-testid="attempts-table">
        <caption className="mb-1 text-left text-xs text-muted">
          Every drag in this session, in order. Cancelled drags have no duration or release error.
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-1 pr-3 font-semibold">#</th>
            <th scope="col" className="py-1 pr-3 font-semibold">Item · attempt</th>
            <th scope="col" className="py-1 pr-3 font-semibold">Outcome</th>
            <th scope="col" className="py-1 pr-3 font-semibold">Duration</th>
            <th scope="col" className="py-1 font-semibold">Release error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-b-0" data-testid="attempt-row">
              <th scope="row" className="py-1 pr-3 font-normal">{r.index}</th>
              <td className="py-1 pr-3">{r.label}</td>
              <td className="py-1 pr-3">{r.outcome}</td>
              <td className="py-1 pr-3 font-mono">{formatMilliseconds(r.duration)}</td>
              <td className="py-1 font-mono">{formatPixels(r.releaseError)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
