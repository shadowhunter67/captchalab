"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createEventRecorder, type EventRecorder, type InteractionSession } from "@captchalab/captcha-core";
import { ClassificationCard, ClassifierDisclaimer } from "@/components/behavior/ClassificationCard";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { Card } from "@/components/inspect/Card";
import { classify, type Classification } from "@/lib/behavior/classifier";
import { signalRows } from "@/lib/behavior/compare";
import {
  INVISIBLE_PAD,
  INVISIBLE_PAD_ID,
  INVISIBLE_PROFILES,
  INVISIBLE_PROFILE_TEXT,
  INVISIBLE_TARGETS,
  INVISIBLE_TARGET_ID,
  INVISIBLE_TARGET_RADIUS,
  analyzeInvisibleSession,
  escalationFor,
  generateSyntheticInvisibleSession,
  type InvisibleProfile,
} from "@/lib/behavior/invisible";
import type { BehavioralVector, SyntheticMeta } from "@/lib/behavior/types";
import { useT } from "@/lib/i18n";
import { toPointerSample, toRecorderEvent, type PointerKind } from "@/lib/pointer-adapter";

interface Result {
  origin: "human" | "synthetic";
  session: InteractionSession;
  vector: BehavioralVector;
  classification: Classification;
  meta?: SyntheticMeta;
}

const isTarget = (el: EventTarget | null): boolean => el instanceof Element && el.closest("[data-inv-target]") !== null;

function summarize(session: InteractionSession, origin: Result["origin"], meta?: SyntheticMeta): Result {
  const vector = analyzeInvisibleSession(session);
  return { origin, session, vector, classification: classify(vector), ...(meta ? { meta } : {}) };
}

/**
 * The Invisible / Behavioral demo, on this page only. After an explicit Start, a neutral task (click a target
 * that moves) is recorded inside the pad below; the same signals and the same experimental classifier as in
 * Compare are applied; a SIMULATED escalation suggestion is shown. Nothing here navigates, blocks or stores.
 */
export function InvisibleLab() {
  const t = useT();
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<EventRecorder | null>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLButtonElement>(null);
  const downOnTargetRef = useRef(false);

  // Keep the keyboard flow: the new target takes focus.
  useEffect(() => {
    if (phase === "running") targetRef.current?.focus();
  }, [phase, step]);

  const start = (): void => {
    recorderRef.current = createEventRecorder({ captchaId: "invisible" });
    downOnTargetRef.current = false;
    setResult(null);
    setError(null);
    setStep(0);
    setPhase("running");
  };

  const reset = (): void => {
    recorderRef.current = null;
    setResult(null);
    setError(null);
    setStep(0);
    setPhase("idle");
  };

  const finish = (): void => {
    try {
      const rec = recorderRef.current;
      if (!rec) return;
      const session = rec.finish();
      recorderRef.current = null;
      setResult(summarize(session, "human"));
      setPhase("done");
    } catch (err) {
      console.error("Invisible analysis failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không phân tích được lần thử này. Hãy bắt đầu lại.", "Could not analyze this run. Start again."));
      setPhase("idle");
    }
  };

  const showSynthetic = (profile: InvisibleProfile): void => {
    try {
      recorderRef.current = null;
      const { session, meta } = generateSyntheticInvisibleSession(profile, 1);
      setResult(summarize(session, "synthetic", meta));
      setError(null);
      setPhase("done");
    } catch (err) {
      setResult(null);
      console.error("Synthetic example failed", err instanceof Error ? err.message : "unknown error");
      setError(t("Không tạo được ví dụ mô phỏng.", "Could not generate the synthetic example."));
    }
  };

  const record = (kind: PointerKind, e: PointerEvent<HTMLDivElement>, target: string): void => {
    const rect = padRef.current?.getBoundingClientRect();
    const sample = toPointerSample(e, { left: rect?.left ?? 0, top: rect?.top ?? 0 });
    if (sample) recorderRef.current?.record(toRecorderEvent(kind, sample, target));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const on = isTarget(e.target);
    downOnTargetRef.current = on;
    record("pointerdown", e, on ? INVISIBLE_TARGET_ID : INVISIBLE_PAD_ID);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    const on = isTarget(e.target);
    // Pressed on the target but released elsewhere: no click happens, so it is a cancel, not a click.
    const kind: PointerKind = downOnTargetRef.current && !on ? "pointercancel" : "pointerup";
    record(kind, e, downOnTargetRef.current ? INVISIBLE_TARGET_ID : INVISIBLE_PAD_ID);
    downOnTargetRef.current = false;
  };

  const onTargetKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if ((e.code === "Space" || e.code === "Enter") && !e.repeat) recorderRef.current?.record({ type: "keydown", code: e.code, target: INVISIBLE_TARGET_ID });
  };

  const advance = (): void => {
    const next = step + 1;
    if (next >= INVISIBLE_TARGETS.length) finish();
    else setStep(next);
  };

  const at = INVISIBLE_TARGETS[Math.min(step, INVISIBLE_TARGETS.length - 1)]!;
  const escalation = result ? escalationFor(result.classification.label) : null;
  const rows = useMemo(() => (result ? signalRows(result.vector, null, "invisible", t) : []), [result, t]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/behavior" className="text-sm text-muted underline">
          {t("Phòng thí nghiệm hành vi", "Behavioral Lab")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Thử nghiệm hành vi / vô hình", "Behavioral / invisible demo")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Một nhiệm vụ nhỏ trung tính: bấm vào mục tiêu mỗi lần nó dời chỗ. Hệ thống quan sát tương tác của bạn trong khung bên dưới, đưa ra phân loại thử nghiệm và một gợi ý leo thang chỉ mang tính mô phỏng. Không có câu đố nào cả.",
            "A small neutral task: click the target each time it moves. The lab observes your interaction inside the pad below, gives an experimental classification and a simulated escalation suggestion. There is no puzzle.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />
      <p className="rounded-lg border border-line bg-panel p-3 text-xs text-muted" data-testid="invisible-scope">
        {t(
          "Không có gì được ghi trước khi bạn bấm Bắt đầu, và chỉ ghi bên trong khung bên dưới trên trang này. Không theo dõi cả trang web, không lưu, không gửi đi, không chặn hay chuyển hướng bạn.",
          "Nothing is recorded before you press Start, and only inside the pad below on this page. No site-wide tracking, nothing stored or sent, and you are never blocked or redirected.",
        )}
      </p>

      <section aria-labelledby="task-h" className="space-y-3 rounded-lg border border-line bg-panel p-4">
        <h2 id="task-h" className="text-base font-semibold">{t("Nhiệm vụ", "Task")}</h2>
        {phase === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("Bấm Bắt đầu, rồi bấm vào mục tiêu 4 lần liên tiếp. Dùng bàn phím cũng được: Tab tới mục tiêu rồi nhấn Enter hoặc Space.", "Press Start, then click the target 4 times in a row. A keyboard works too: Tab to the target and press Enter or Space.")}</p>
            <button type="button" data-testid="invisible-start" onClick={start} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
              {t("Bắt đầu", "Start")}
            </button>
          </div>
        )}
        {phase === "running" && (
          <div className="space-y-2">
            <p className="text-sm" role="status" data-testid="invisible-progress">
              {t(`Mục tiêu ${step + 1} trên ${INVISIBLE_TARGETS.length}`, `Target ${step + 1} of ${INVISIBLE_TARGETS.length}`)}
            </p>
            <div
              ref={padRef}
              role="group"
              aria-label={t("Khung tương tác", "Interaction pad")}
              data-testid="invisible-pad"
              onPointerDown={onPointerDown}
              onPointerMove={(e) => record("pointermove", e, INVISIBLE_PAD_ID)}
              onPointerUp={onPointerUp}
              onPointerCancel={(e) => {
                record("pointercancel", e, downOnTargetRef.current ? INVISIBLE_TARGET_ID : INVISIBLE_PAD_ID);
                downOnTargetRef.current = false;
              }}
              className="relative touch-none select-none rounded-lg border border-dashed border-line bg-bg"
              style={{ width: INVISIBLE_PAD.width, maxWidth: "100%", height: INVISIBLE_PAD.height }}
            >
              <button
                key={step}
                ref={targetRef}
                type="button"
                data-inv-target
                data-testid="invisible-target"
                aria-label={t(`Mục tiêu ${step + 1} trên ${INVISIBLE_TARGETS.length}`, `Target ${step + 1} of ${INVISIBLE_TARGETS.length}`)}
                onKeyDown={onTargetKeyDown}
                onClick={advance}
                className="absolute flex items-center justify-center rounded-full border-2 border-fg bg-accent text-sm font-semibold text-bg"
                style={{
                  width: INVISIBLE_TARGET_RADIUS * 2,
                  height: INVISIBLE_TARGET_RADIUS * 2,
                  left: `${((at.x - INVISIBLE_TARGET_RADIUS) / INVISIBLE_PAD.width) * 100}%`,
                  top: at.y - INVISIBLE_TARGET_RADIUS,
                }}
              >
                {step + 1}
              </button>
            </div>
            <button type="button" data-testid="invisible-cancel" onClick={reset} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
              {t("Dừng và xoá", "Stop and discard")}
            </button>
          </div>
        )}
        {phase === "done" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted" role="status" data-testid="invisible-done">
              {result?.origin === "synthetic" ? t("Ví dụ mô phỏng đã được tạo.", "Synthetic example generated.") : t("Xong. Kết quả ở bên dưới.", "Done. The result is below.")}
            </p>
            <button type="button" data-testid="invisible-reset" onClick={reset} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track">
              {t("Xoá mẫu và làm lại", "Clear the sample and start over")}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}

        <fieldset className="border-t border-line pt-3">
          <legend className="text-sm font-medium">{t("Hoặc xem một ví dụ mô phỏng (dữ liệu được sinh ra)", "Or see a synthetic example (generated data)")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INVISIBLE_PROFILES.map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`invisible-synth-${p}`}
                title={t(INVISIBLE_PROFILE_TEXT[p].descVi, INVISIBLE_PROFILE_TEXT[p].descEn)}
                onClick={() => showSynthetic(p)}
                disabled={phase === "running"}
                className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track disabled:opacity-50"
              >
                {t(INVISIBLE_PROFILE_TEXT[p].vi, INVISIBLE_PROFILE_TEXT[p].en)}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      {result && escalation && (
        <section aria-labelledby="result-h" className="space-y-4" data-testid="invisible-result">
          <h2 id="result-h" className="text-base font-semibold">{t("Kết quả", "Result")}</h2>
          {result.meta && (
            <p className="text-xs text-muted" data-testid="invisible-synthetic-meta">
              {t("Mẫu mô phỏng", "Synthetic profile")}: {t(INVISIBLE_PROFILE_TEXT[result.meta.profile as InvisibleProfile].vi, INVISIBLE_PROFILE_TEXT[result.meta.profile as InvisibleProfile].en)} · {t("Phiên bản bộ sinh", "Generator version")}: <span className="font-mono">{result.meta.generator}</span> · seed <span className="font-mono">{result.meta.seed}</span>
            </p>
          )}
          <ClassifierDisclaimer />
          <ClassificationCard title={result.origin === "human" ? t("Lần thử của bạn", "Your run") : t("Ví dụ mô phỏng", "Synthetic example")} classification={result.classification} testId="invisible-class" />

          <Card id="escalation-h" title={t("Gợi ý leo thang thử nghiệm", "Experimental escalation suggestion")}>
            <p className="text-sm" data-testid="escalation-text" data-escalation={escalation.key}>
              {t(escalation.vi, escalation.en)}
            </p>
            {escalation.href && (
              <p className="mt-2 text-sm">
                <Link href={escalation.href} className="underline" data-testid="escalation-link">
                  {t("Mở bản demo gợi ý (tuỳ chọn)", "Open the suggested demo (optional)")}
                </Link>
              </p>
            )}
            <p className="mt-3 text-xs text-muted" data-testid="escalation-note">
              {t(
                "Đây chỉ là mô phỏng. Không có trang nào bị chặn, chuyển hướng hay bị hạn chế, và đây không phải một công cụ đánh giá rủi ro dùng thật.",
                "This is a simulation only. Nothing is blocked, redirected or restricted, and it is not a production risk engine.",
              )}
            </p>
          </Card>

          <Card id="signals-h" title={t("Các tín hiệu đã đo", "Measured signals")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="invisible-signals">
                <caption className="sr-only">{t("Các tín hiệu đo được từ nhiệm vụ", "Signals measured from the task")}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
                    <th scope="col" className="py-1 font-medium">{t("Giá trị", "Value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line/50">
                      <th scope="row" className="py-1 pr-3 font-normal" title={r.description}>{r.label}</th>
                      <td className="py-1 font-mono">{r.human}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
    </main>
  );
}
