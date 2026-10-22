import type { InteractionEvent } from "@captchalab/captcha-core";
import { projectEventFields } from "@/lib/inspect/events";

interface Props {
  event: InteractionEvent | null;
  index: number | null;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onClear: () => void;
}

const btn = "rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track disabled:opacity-50";

/** Shows the normalized fields of one selected event. Never shows DOM objects or logs anything. */
export function EventInspector({ event, index, total, onPrevious, onNext, onClear }: Props) {
  return (
    <div data-testid="event-inspector" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={onPrevious} disabled={total === 0} data-testid="event-prev">
          Previous event
        </button>
        <button type="button" className={btn} onClick={onNext} disabled={total === 0} data-testid="event-next">
          Next event
        </button>
        <button type="button" className={btn} onClick={onClear} disabled={index === null}>
          Clear selection
        </button>
        <span className="text-sm text-muted" aria-live="polite" data-testid="event-position">
          {index === null ? `${total} events` : `Selected event #${index + 1} of ${total}`}
        </span>
      </div>
      {event === null ? (
        <p className="text-sm text-muted">Select a marker on the timeline, or step through events, to see its fields.</p>
      ) : (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          {projectEventFields(event).map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-muted">{f.label}</dt>
              <dd className="break-all font-mono" data-testid={`event-field-${f.label}`}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
