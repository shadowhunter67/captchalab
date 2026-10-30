"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import { AUDIO_PLAY_TARGET, AUDIO_TARGET, registry, toTextKeyCode, type AudioChallenge, type AudioFeatures } from "@captchalab/captcha-plugins";
import { useT } from "@/lib/i18n";
import type { SessionReport } from "@/lib/behavior/human";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";
import { AudioInspect } from "./AudioInspect";
import { createAudioPlayer, type AudioPlayer, type PlayerState } from "./audio-player";
import { playLabel, statusText } from "./audio-view-data";

interface Completed {
  submission: number;
  session: InteractionSession;
  verification: VerificationResult;
  featureSet: FeatureSet<AudioFeatures>;
}

interface Props {
  challenge: AudioChallenge;
  onNewChallenge: () => void;
  /** Called after each analyzed submission (used by the Behavioral Lab). */
  onResult?: (report: SessionReport) => void;
  /** Called when the shown result is discarded. */
  onReset?: () => void;
  /** Hide the Inspect panel (the Behavioral Lab shows its own view). Default true. */
  showInspect?: boolean;
}

/**
 * One challenge = one session (the parent keys it by challenge). Nothing plays until the Play button is used.
 * The typed value lives only in the input element and is read once, when verifying: it is not kept in React
 * state, storage or the recording. Key events are stored with coarsened codes (digits -> "Digit"). The digits
 * are never shown as text. The microphone is never used.
 */
export function AudioSession({ challenge: initialChallenge, onNewChallenge, onResult, onReset, showInspect = true }: Props) {
  const t = useT();
  const [challenge] = useState(initialChallenge);
  const plugin = registry.get("audio");
  const inputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const submissionsRef = useRef(0);
  const [recorder] = useState(() => createEventRecorder({ captchaId: plugin.id }));
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayerState>("idle");
  const [played, setPlayed] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);

  // The player lives exactly as long as this session: unmount (new challenge, variant change) stops the sound.
  useEffect(() => {
    const player = createAudioPlayer(challenge, {
      onStateChange: (s) => {
        setPlayState(s);
        if (s === "loading") setAudioFailed(false);
      },
      onError: () => setAudioFailed(true),
    });
    playerRef.current = player;
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [challenge]);

  const recordPlayPointer = (kind: PointerKind, e: PointerEvent<HTMLButtonElement>): void => {
    const b = e.currentTarget.getBoundingClientRect();
    const sample = toPointerSample(e, { left: b.left, top: b.top });
    if (!sample) return;
    // A captured touch/pen release outside the button does not click it: record a cancel.
    const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    const recorded: PointerKind = kind === "pointerup" && !inside ? "pointercancel" : kind;
    recorder.record(toRecorderEvent(recorded, sample, AUDIO_PLAY_TARGET));
  };

  const onPlayKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    const code = e.code === "NumpadEnter" ? "Enter" : e.code;
    if (code !== "Space" && code !== "Enter") return;
    // A held key must not replay again.
    if (e.repeat) e.preventDefault();
    else recorder.record({ type: "keydown", code, target: AUDIO_PLAY_TARGET });
  };

  const onPlay = (): void => {
    setPlayed(true);
    void playerRef.current?.play();
  };

  const record = (type: "keydown" | "keyup", e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.nativeEvent.isComposing) return; // IME composition: individual keys are not meaningful
    recorder.record({ type, code: toTextKeyCode(e.code), target: AUDIO_TARGET });
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    try {
      const session = recorder.snapshot();
      const verification = plugin.verify(challenge, { value: inputRef.current?.value ?? "" }, session);
      const featureSet = plugin.extractFeatures(challenge, session);
      submissionsRef.current += 1;
      setCompleted({ submission: submissionsRef.current, session, verification, featureSet });
      setError(null);
      onResult?.({ session, context: undefined, passed: verification.passed });
      // The value is only needed to verify: once the challenge is passed, do not leave it in the field.
      if (verification.passed && inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("Audio submission failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu thử thách mới.", "Could not analyze this attempt. Start a new challenge."));
    }
  };

  const playing = playState === "playing";
  return (
    <div className="space-y-6">
      <section aria-labelledby="try-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="try-h" className="mb-1 text-base font-semibold">
          {t("Thử", "Try")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "Nhấn Phát để nghe một dãy chữ số, rồi gõ các chữ số bạn nghe được và nhấn Xác minh hoặc Enter. Bạn có thể phát lại bao nhiêu lần tùy ý.",
            "Press Play to hear a sequence of digits, then type the digits you heard and press Verify or Enter. You can replay as often as you like.",
          )}
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="audio-play"
            data-playing={playing ? "true" : "false"}
            onPointerDown={(e) => recordPlayPointer("pointerdown", e)}
            onPointerUp={(e) => recordPlayPointer("pointerup", e)}
            onPointerCancel={(e) => recordPlayPointer("pointercancel", e)}
            onKeyDown={onPlayKeyDown}
            onClick={onPlay}
            className="touch-manipulation rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            {playLabel(played, t)}
          </button>
          <span role="status" aria-live="polite" data-testid="audio-status" className="text-sm text-muted">
            {statusText(playState, t)}
          </span>
        </div>
        {audioFailed && (
          <p role="alert" data-testid="audio-error" className="mb-4 text-sm text-bad">
            {t(
              "Không tải được âm thanh. Hãy thử lại, hoặc dùng thử thách thay thế.",
              "The audio could not be loaded. Try again, or use the alternative challenge.",
            )}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="audio-answer" className="mb-1 block text-sm font-medium">
              {t("Các chữ số bạn nghe được", "Digits you heard")}
            </label>
            <input
              id="audio-answer"
              ref={inputRef}
              data-testid="audio-answer"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={10}
              // Any change of the content (typing, paste, drop, speech, IME) makes a shown result stale.
              onChange={() => {
                setCompleted(null);
                setError(null);
                onReset?.();
              }}
              onKeyDown={(e) => record("keydown", e)}
              onKeyUp={(e) => record("keyup", e)}
              className="w-full max-w-xs rounded-md border border-line bg-bg px-3 py-2 font-mono text-lg tracking-widest"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" data-testid="verify" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
              {t("Xác minh", "Verify")}
            </button>
            <button type="button" onClick={onNewChallenge} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
              {t("Thử thách mới", "New challenge")}
            </button>
            <Link prefetch={false} href="/playground/math-logic" data-testid="audio-alternative" className="text-sm underline">
              {t("Thử thách thay thế", "Try an alternative challenge")}
            </Link>
          </div>
        </form>
        <div className="mt-3 space-y-2 text-xs text-muted">
          <p>
            {t(
              "Khả năng tiếp cận: âm thanh giúp được một số người không dùng được thử thách hình ảnh, nhưng không dùng được với người điếc hoặc nghe kém. Hệ thống thật cần có các hình thức thay thế; bản demo này không dành được cho mọi người. Âm thanh là các chữ số tiếng Anh, âm lượng theo thiết bị của bạn và trang này không tăng âm lượng.",
              "Accessibility: audio helps some people who cannot use visual challenges but is unusable for deaf or hard-of-hearing people. Production systems need alternative modalities; this demo is not accessible to everyone. The sound is English digits, the volume of your device applies and the page does not boost it.",
            )}
          </p>
          <p>
            {t(
              "Micro không bao giờ được dùng, và không có gì được ghi lại từ bạn ngoài các sự kiện phím và nút.",
              "The microphone is never used, and nothing is recorded from you except key and button events.",
            )}
          </p>
        </div>
      </section>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      {completed && showInspect && <AudioInspect key={completed.submission} verification={completed.verification} featureSet={completed.featureSet} session={completed.session} />}
    </div>
  );
}
