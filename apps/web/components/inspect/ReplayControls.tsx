"use client";

import type { RefObject } from "react";
import { useT } from "@/lib/i18n";
import { REPLAY_SPEEDS, type ReplaySpeed, type ReplayStatus } from "@/lib/replay/replay-clock";

interface Props {
  status: ReplayStatus;
  speed: ReplaySpeed;
  startTime: number;
  endTime: number;
  disabled?: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeed: (speed: ReplaySpeed) => void;
  onSeek: (time: number) => void;
  /** Updated imperatively on every replay frame (no React re-render per frame). */
  rangeRef: RefObject<HTMLInputElement | null>;
  labelRef: RefObject<HTMLSpanElement | null>;
}

const btn =
  "rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track disabled:cursor-not-allowed disabled:opacity-50";

export function ReplayControls({
  status,
  speed,
  startTime,
  endTime,
  disabled,
  onPlayPause,
  onRestart,
  onSpeed,
  onSeek,
  rangeRef,
  labelRef,
}: Props) {
  const t = useT();
  const playLabel =
    status === "playing"
      ? t("Tạm dừng", "Pause")
      : status === "finished"
        ? t("Phát lại thao tác", "Replay interaction")
        : t("Phát", "Play");
  return (
    <div className="mt-3 space-y-2" data-testid="replay-controls" data-status={status}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={onPlayPause} disabled={disabled} data-testid="replay-play-pause">
          {playLabel}
        </button>
        <button type="button" className={btn} onClick={onRestart} disabled={disabled} data-testid="replay-restart">
          {t("Phát lại từ đầu", "Restart")}
        </button>
        <div role="group" aria-label={t("Tốc độ phát lại", "Replay speed")} className="flex overflow-hidden rounded-md border border-line">
          {REPLAY_SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              disabled={disabled}
              onClick={() => onSpeed(s)}
              data-testid={`replay-speed-${s}`}
              className={`px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                speed === s ? "bg-accent text-bg" : "bg-panel hover:bg-track"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          ref={rangeRef}
          type="range"
          aria-label={t("Vị trí phát lại", "Replay position")}
          min={startTime}
          max={endTime}
          step="any"
          defaultValue={startTime}
          disabled={disabled}
          onInput={(e) => {
            // Browsers round range values to ~15 significant digits, so a value at an end can land a hair
            // inside it; snap to the exact bound so "scrub to the end" really finishes the replay.
            const v = Number(e.currentTarget.value);
            onSeek(Math.abs(v - endTime) < 1e-6 ? endTime : Math.abs(v - startTime) < 1e-6 ? startTime : v);
          }}
          className="min-w-0 flex-1"
          data-testid="replay-scrubber"
        />
        <span ref={labelRef} className="shrink-0 font-mono text-xs text-muted" data-testid="replay-time" />
      </div>
    </div>
  );
}
