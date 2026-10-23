"use client";

import { useMemo, useRef } from "react";
import type { InteractionSession } from "@captchalab/captcha-core";
import { useT } from "@/lib/i18n";
import { ReplayControls } from "@/components/inspect/ReplayControls";
import { useReplayPanel } from "@/lib/replay/useReplayPanel";
import { createCheckboxReplay } from "./checkbox-replay-state";
import type { ControlSize } from "./CheckboxSurface";

interface Props {
  session: InteractionSession;
  size: ControlSize;
}

const BOX = 24;
const BOX_X = 16;

/**
 * Checkbox replay: a drawing of the recorded activation (virtual pointer or Space key, press and
 * checked state), driven by the generic replay clock. It never dispatches DOM events or touches the
 * real control.
 */
export function CheckboxReplay({ session, size }: Props) {
  const t = useT();
  const model = useMemo(() => createCheckboxReplay(session), [session]);

  const boxRef = useRef<SVGRectElement>(null);
  const markRef = useRef<SVGPathElement>(null);
  const pressRef = useRef<SVGRectElement>(null);
  const cursorRef = useRef<SVGCircleElement>(null);
  const keyRef = useRef<SVGGElement>(null);

  const { hostRef, controlsProps } = useReplayPanel(model.range, session, (s, host) => {
    const st = model.at(s.currentTime);
    boxRef.current?.setAttribute("fill", st.checked ? "var(--accent)" : "var(--bg)");
    markRef.current?.setAttribute("opacity", st.checked ? "1" : "0");
    pressRef.current?.setAttribute("opacity", st.pointerPressed || st.keyPressed ? "0.35" : "0");
    keyRef.current?.setAttribute("opacity", st.keyPressed ? "1" : "0.25");
    const c = cursorRef.current;
    if (c) {
      c.setAttribute("opacity", st.pointer ? "1" : "0");
      if (st.pointer) {
        c.setAttribute("cx", String(st.pointer.x));
        c.setAttribute("cy", String(st.pointer.y));
      }
      c.setAttribute("r", st.pointerPressed ? "9" : "5"); // press is not shown by color alone
    }
    if (host) {
      host.dataset.replayChecked = String(st.checked);
      host.dataset.replayPressed = String(st.pointerPressed || st.keyPressed);
    }
  });

  if (!model.range) {
    return (
      <p className="text-sm text-muted" data-testid="replay-empty">
        {t(
          "Không ghi được sự kiện con trỏ hoặc phím nào cho lần đánh dấu này (ví dụ do công nghệ hỗ trợ kích hoạt), nên không có gì để phát lại.",
          "No pointer or key events were recorded for this check (for example, it was activated by assistive technology), so there is nothing to replay.",
        )}
      </p>
    );
  }

  const { width, height } = size;
  const midY = height / 2;
  return (
    <div ref={hostRef} data-testid="replay">
      <svg
        role="img"
        aria-label={t(
          "Phát lại thao tác với ô đánh dấu: một con trỏ ảo hoặc phím Space nhấn vào ô, và ô được đánh dấu.",
          "Replay of the checkbox interaction: a virtual pointer or the Space key presses the box, which becomes checked.",
        )}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md rounded-lg bg-bg ring-1 ring-line"
        style={{ aspectRatio: `${width} / ${height}` }}
        data-testid="checkbox-replay-svg"
      >
        <rect x={BOX_X - 4} y={midY - BOX / 2 - 4} width={BOX + 8} height={BOX + 8} rx={7} fill="var(--accent)" opacity={0} ref={pressRef} />
        <rect ref={boxRef} x={BOX_X} y={midY - BOX / 2} width={BOX} height={BOX} rx={4} fill="var(--bg)" stroke="var(--fg)" strokeWidth={2} />
        <path
          ref={markRef}
          d={`M${BOX_X + 5} ${midY} L${BOX_X + 10} ${midY + 5} L${BOX_X + 19} ${midY - 6}`}
          fill="none"
          stroke="var(--bg)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0}
        />
        <text x={BOX_X + BOX + 12} y={midY + 5} fontSize={14} fill="var(--fg)">
          {t("Đánh dấu ô này để vượt qua thử thách", "Check this box to pass the challenge")}
        </text>
        <g ref={keyRef} opacity={0.25}>
          <rect x={width - 66} y={midY - 11} width={54} height={22} rx={5} fill="none" stroke="var(--fg)" strokeWidth={1.5} />
          <text x={width - 39} y={midY + 4} fontSize={11} textAnchor="middle" fill="var(--fg)">
            Space
          </text>
        </g>
        <circle ref={cursorRef} cx={0} cy={0} r={5} opacity={0} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} />
      </svg>
      <ReplayControls {...controlsProps} />
      <p className="mt-2 text-xs text-muted">
        {t(
          "Phần phát lại chỉ vẽ lại các sự kiện đã ghi, không điều khiển ô đánh dấu. Chấm lớn hơn nghĩa là con trỏ đang nhấn; nhãn Space đậm lên khi phím đang được giữ. Tiêu điểm không được ghi nên không hiển thị. Khi bật giảm chuyển động, nút Phát sẽ nhảy thẳng đến cuối; hãy dùng thanh vị trí để xem từng bước.",
          "The replay draws your recorded events; it does not control the checkbox. A larger dot means the pointer is pressed; the Space badge is solid while the key is held. Focus is not recorded, so it is not shown. With reduced motion enabled, Play jumps to the end; use the position control to step through.",
        )}
      </p>
    </div>
  );
}
