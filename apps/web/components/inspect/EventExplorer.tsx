"use client";

import { useMemo } from "react";
import type { InteractionSession } from "@captchalab/captcha-core";
import { buildTimelineModel, timelineKind, type TimelineAnnotation } from "@/lib/inspect/events";
import type { EventSelection } from "@/lib/inspect/useEventSelection";
import { EventInspector } from "./EventInspector";
import { EventTimeline } from "./EventTimeline";

interface Props {
  session: InteractionSession;
  /** Selection state from useEventSelection(session); the page keeps it so other panels can follow it. */
  selection: EventSelection;
  /** UI annotations drawn on the axis (caller-supplied wording). */
  annotations?: readonly TimelineAnnotation[];
}

/** Event timeline + event inspector for one session: the composition every CAPTCHA's Inspect uses. */
export function EventExplorer({ session, selection, annotations }: Props) {
  const times = useMemo(() => (annotations ?? []).map((a) => a.t), [annotations]);
  const model = useMemo(() => buildTimelineModel(session, 48, times), [session, times]);
  const selected = selection.event;
  return (
    <>
      <EventTimeline
        model={model}
        {...(annotations ? { annotations } : {})}
        selectedIsMove={selected !== null && timelineKind(selected) === "move"}
        selectedT={selected?.t ?? null}
        selectedIndex={selection.index}
        onSelect={selection.select}
      />
      <div className="mt-3">
        <EventInspector
          event={selected}
          index={selection.index}
          total={selection.total}
          onPrevious={selection.previous}
          onNext={selection.next}
          onClear={selection.clear}
        />
      </div>
    </>
  );
}
