"use client";

import { useMemo, useRef } from "react";
import type { InteractionSession } from "@captchalab/captcha-core";
import {
  hitRadiusPx,
  itemSizePx,
  normalizedToPx,
  type DragDropChallenge,
  type DragDropLayout,
} from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import { ReplayControls } from "@/components/inspect/ReplayControls";
import { useReplayPanel } from "@/lib/replay/useReplayPanel";
import { createDragDropReplay } from "./drag-drop-replay-state";
import { ShapeMark } from "./ShapeGlyph";

interface Props {
  challenge: DragDropChallenge;
  layout: DragDropLayout;
  session: InteractionSession;
}

/**
 * Replay of the dragged objects: a drawing of recorded data driven by the generic replay clock. Items
 * move, snap onto targets or return exactly as the plugin's rules derived; a larger dot marks the
 * pressed pointer. It never dispatches DOM events or touches the real surface.
 */
export function DragDropReplay({ challenge, layout, session }: Props) {
  const t = useT();
  const model = useMemo(() => createDragDropReplay(challenge, layout, session, t), [challenge, layout, session, t]);
  const size = itemSizePx(challenge, layout);
  const radius = hitRadiusPx(challenge, layout);

  const itemRefs = useRef(new Map<string, SVGGElement>());
  const cursorRef = useRef<SVGCircleElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  const { hostRef, controlsProps } = useReplayPanel(model.range, session, (s) => {
    const st = model.at(s.currentTime);
    for (const [id, item] of Object.entries(st.items)) {
      const g = itemRefs.current.get(id);
      if (!g) continue;
      g.setAttribute("transform", `translate(${item.center.x - size / 2} ${item.center.y - size / 2}) scale(${size / 100})`);
      g.setAttribute("data-cx", item.center.x.toFixed(1));
      g.setAttribute("data-cy", item.center.y.toFixed(1));
      g.setAttribute("data-lifted", String(item.lifted));
      g.setAttribute("opacity", item.lifted ? "0.8" : "1");
    }
    const c = cursorRef.current;
    if (c) {
      c.setAttribute("opacity", st.pointer ? "1" : "0");
      if (st.pointer) {
        c.setAttribute("cx", String(st.pointer.x));
        c.setAttribute("cy", String(st.pointer.y));
      }
    }
    if (captionRef.current) captionRef.current.textContent = st.caption;
  });

  if (!model.range) {
    return (
      <p className="text-sm text-muted" data-testid="replay-empty">
        {t("Chưa ghi nhận lần kéo nào nên không có gì để phát lại.", "No drag was recorded, so there is nothing to replay.")}
      </p>
    );
  }

  const kindOf = (itemId: string) => challenge.items.find((i) => i.id === itemId)?.kind ?? "circle";
  return (
    <div ref={hostRef} data-testid="replay">
      <svg
        role="img"
        aria-label={t(
          "Phát lại thao tác kéo thả: một con trỏ ảo đưa từng hình đến một vùng thả; hình khớp vào chỗ khi thả đúng hoặc nhầm đích, và quay về sau khi thả trượt hoặc bị hủy.",
          "Replay of the drag and drop: a virtual pointer carries each shape to a drop area; it snaps into place on a correct or wrong target and returns after a miss or a cancel.",
        )}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full max-w-[560px] rounded-lg bg-bg ring-1 ring-line"
        style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        data-testid="drag-replay-svg"
      >
        {challenge.targets.map((t) => {
          const c = normalizedToPx(t.position, layout);
          return (
            <g key={t.id}>
              <circle cx={c.x} cy={c.y} r={radius} fill="none" stroke="var(--line)" strokeWidth={2} strokeDasharray="6 5" />
              <ShapeMark kind={kindOf(t.acceptsItemId)} size={size} outline x={c.x} y={c.y} />
            </g>
          );
        })}
        {challenge.items.map((item) => {
          const c = normalizedToPx(item.start, layout);
          return (
            <ShapeMark
              key={item.id}
              kind={item.kind}
              size={size}
              x={c.x}
              y={c.y}
              testId={`replay-item-${item.id}`}
              groupRef={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
            />
          );
        })}
        <circle ref={cursorRef} cx={0} cy={0} r={8} opacity={0} fill="var(--fg)" stroke="var(--bg)" strokeWidth={2} data-testid="replay-pointer" />
      </svg>
      <p ref={captionRef} className="mt-2 min-h-5 text-sm" data-testid="replay-caption" />
      <ReplayControls {...controlsProps} />
      <p className="mt-2 text-xs text-muted">
        {t(
          "Bản phát lại chỉ vẽ lại các sự kiện đã ghi; nó không điều khiển các hình. Chấm đậm là con trỏ khi đang giữ một hình. Khi bật giảm chuyển động, nút Phát sẽ nhảy thẳng đến cuối; hãy dùng thanh vị trí để xem từng bước.",
          "The replay draws your recorded events; it does not control the shapes. The dark dot is the pointer while a shape is held. With reduced motion enabled, Play jumps to the end; use the position control to step through.",
        )}
      </p>
    </div>
  );
}
