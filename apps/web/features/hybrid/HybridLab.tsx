"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createRng } from "@captchalab/captcha-core";
import { registry, type AudioChallenge, type PowChallenge, type SliderChallenge } from "@captchalab/captcha-plugins";
import { AudioSession } from "@/features/audio/AudioSession";
import { PowSession } from "@/features/proof-of-work/PowSession";
import { SliderSession } from "@/features/slider/SliderSession";
import { IdScope } from "@/lib/id-scope";
import { Card } from "@/components/inspect/Card";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { HYBRID_KINDS, childUnlocked, hybridVerdict, isHybridKind, withOutcome, type HybridKind, type HybridReason, type HybridStages } from "@/lib/hybrid/hybrid";
import { useT } from "@/lib/i18n";
import { stampSeed, useSeededChallenge } from "@/lib/useSeededChallenge";

type Pair = { kind: "pow-visual"; pow: PowChallenge; child: SliderChallenge } | { kind: "pow-audio"; pow: PowChallenge; child: AudioChallenge };

/** One seed makes both challenges. The proof of work stays at its lightest level. */
function generatePair(kind: HybridKind, seed: number): Pair {
  const pow = stampSeed(registry.get("proof-of-work").generate({ rng: createRng(seed), variantId: "hash-prefix", difficulty: "easy" }), seed);
  const childRng = createRng((seed ^ 0x9e3779b1) >>> 0);
  return kind === "pow-visual"
    ? { kind, pow, child: registry.get("slider").generate({ rng: childRng, difficulty: "medium" }) }
    : { kind, pow, child: registry.get("audio").generate({ rng: childRng, difficulty: "easy" }) };
}
const generateVisual = (seed: number): Pair => generatePair("pow-visual", seed);
const generateAudio = (seed: number): Pair => generatePair("pow-audio", seed);

const REASON: Record<HybridReason, readonly [string, string]> = {
  passed: ["Cả hai chặng đều hợp lệ.", "Both stages are valid."],
  "pow-missing": ["Chưa có bằng chứng công việc hợp lệ cho thử thách này.", "No valid proof of work for this challenge yet."],
  "pow-failed": ["Bằng chứng công việc không hợp lệ.", "The proof of work is not valid."],
  "child-missing": ["Chặng thứ hai chưa được hoàn thành.", "The second stage is not completed yet."],
  "child-failed": ["Chặng thứ hai chưa đạt.", "The second stage did not pass."],
};

/**
 * Composed lab: Proof of Work, then a Slider or Audio challenge. Each stage is verified by its own plugin; lib/hybrid
 * is the one rule that joins them. Stage outcomes are kept by challenge id, so a result about an older challenge can
 * never count; the board remounts per challenge. The two stages keep separate Inspect panels: computation numbers
 * stay with the Proof of Work, interaction numbers with the second stage, and nothing mixes them.
 */
function HybridBoard({ pair, onNewChallenge }: { pair: Pair; onNewChallenge: () => void }) {
  const t = useT();
  const [stages, setStages] = useState<HybridStages>({ pow: null, child: null });
  const expected = { powId: pair.pow.id, childId: pair.child.id };
  const verdict = hybridVerdict(expected, stages);
  const unlocked = childUnlocked(expected, stages);
  const setOutcome = (stage: "pow" | "child", passed: boolean | null, challengeId: string): void =>
    setStages((s) => withOutcome(s, stage, passed === null ? null : { challengeId, passed }));

  const childName = pair.kind === "pow-visual" ? t("Thanh trượt", "Slider") : t("Âm thanh", "Audio");
  return (
    <div className="space-y-6">
      <Card id="hybrid-verdict-h" title={t("Kết quả cuối (thử nghiệm)", "Final result (experimental)")}>
        <div data-testid="hybrid-verdict" data-passed={verdict.passed ? "true" : "false"} data-reason={verdict.reason} className="space-y-1 text-sm">
          <p className="font-medium" data-testid="hybrid-result">{verdict.passed ? t("Đã đạt cả hai chặng", "Both stages passed") : t("Chưa đạt", "Not passed")}</p>
          <p className="text-muted">{t(...REASON[verdict.reason])}</p>
          <ul className="list-disc pl-5 text-muted">
            <li data-testid="hybrid-pow-state">{t("Chặng 1 (bằng chứng công việc)", "Stage 1 (proof of work)")}: {verdict.pow}</li>
            <li data-testid="hybrid-child-state">{t(`Chặng 2 (${childName})`, `Stage 2 (${childName})`)}: {verdict.child}</li>
          </ul>
        </div>
        <p className="mt-2 text-xs text-muted">
          {t(
            "Chỉ đạt khi cả hai chặng đều đạt. Chỉ số phép tính (số lần băm) và chỉ số tương tác được tách riêng ở từng chặng, không trộn với nhau. Đây là bản minh hoạ, không phải quyết định bảo mật.",
            "It passes only when both stages pass. Computation metrics (hashes) and interaction metrics are kept apart in each stage and never mixed. This is a demonstration, not a security decision.",
          )}
        </p>
        <button type="button" onClick={onNewChallenge} className="mt-3 rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track" data-testid="hybrid-new">
          {t("Thử thách mới", "New challenge")}
        </button>
      </Card>

      <section aria-labelledby="stage1-h" data-testid="stage-pow" className="space-y-3">
        <h2 id="stage1-h" className="text-base font-semibold">{t("Chặng 1 · Phép tính (bằng chứng công việc)", "Stage 1 · Computation (proof of work)")}</h2>
        <IdScope prefix={`${pair.kind}-pow-`}>
          <PowSession challenge={pair.pow} onNewChallenge={onNewChallenge} onResult={(o) => setOutcome("pow", o.passed, o.challengeId)} />
        </IdScope>
      </section>

      <section aria-labelledby="stage2-h" data-testid="stage-child" className="space-y-3">
        <h2 id="stage2-h" className="text-base font-semibold">{t(`Chặng 2 · Tương tác (${childName})`, `Stage 2 · Interaction (${childName})`)}</h2>
        {!unlocked ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted" data-testid="stage-child-locked">
            {t("Chặng này mở khi chặng 1 có bằng chứng hợp lệ.", "This stage opens once stage 1 has a valid proof.")}
          </p>
        ) : (
          <IdScope prefix={`${pair.kind}-child-`}>
            {pair.kind === "pow-visual" ? (
              <SliderSession
                challenge={pair.child}
                onNewChallenge={onNewChallenge}
                onResult={(r) => setOutcome("child", r.verification.passed, pair.child.id)}
                onReset={() => setOutcome("child", null, pair.child.id)}
              />
            ) : (
              <AudioSession
                challenge={pair.child}
                onNewChallenge={onNewChallenge}
                onResult={(r) => setOutcome("child", r.passed, pair.child.id)}
                onReset={() => setOutcome("child", null, pair.child.id)}
              />
            )}
          </IdScope>
        )}
      </section>
    </div>
  );
}

function HybridRun({ kind }: { kind: HybridKind }) {
  const { challenge, failed, round, newChallenge, seed } = useSeededChallenge(kind === "pow-visual" ? generateVisual : generateAudio);
  const t = useT();
  return (
    <>
      <p className="text-xs text-muted">Seed: <span className="font-mono" data-testid="hybrid-seed">{seed ?? "—"}</span></p>
      {failed && <p role="alert" className="text-sm text-bad">{t("Không tạo được thử thách. Hãy tải lại trang.", "Could not generate a challenge. Reload the page.")}</p>}
      {challenge === null && !failed && <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p>}
      {challenge && <HybridBoard key={`${challenge.pow.id}:${round}`} pair={challenge} onNewChallenge={newChallenge} />}
    </>
  );
}

export function HybridLab() {
  const t = useT();
  const [kind, setKind] = useState<HybridKind | null>(null);
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("kind");
    setKind(isHybridKind(k) ? k : "pow-visual");
  }, []);
  const choose = (k: HybridKind): void => {
    setKind(k);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("kind", k);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // The URL is a convenience only.
    }
  };
  const label: Record<HybridKind, string> = { "pow-visual": t("PoW + Hình ảnh (thanh trượt)", "PoW + Visual (slider)"), "pow-audio": t("PoW + Âm thanh", "PoW + Audio") };
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">CaptchaLab</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Thử thách lai", "Hybrid challenge")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Ghép một phép tính (bằng chứng công việc) với một thử thách tương tác có sẵn. Dữ liệu thô không bao giờ rời khỏi thẻ trình duyệt này.",
            "A computation (proof of work) joined to an existing interactive challenge. Raw data never leaves this browser tab.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />
      <div role="group" aria-label={t("Kiểu thử thách lai", "Hybrid kind")} className="flex flex-wrap gap-2">
        {HYBRID_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} data-testid={`hybrid-kind-${k}`} onClick={() => choose(k)} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${kind === k ? "border-accent bg-track" : "border-line bg-panel hover:bg-track"}`}>
            {label[k]}
          </button>
        ))}
      </div>
      {kind && <HybridRun key={kind} kind={kind} />}
    </main>
  );
}
