"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChallengeConfig } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { ChallengeControls } from "@/components/ChallengeControls";
import { ChallengeConfigCard } from "@/components/inspect/ChallengeConfigCard";
import { Card } from "@/components/inspect/Card";
import { ClassificationCard, ClassifierDisclaimer } from "@/components/behavior/ClassificationCard";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { DistributionPanel } from "@/components/behavior/DistributionPanel";
import { EvaluationPanel, type ProfileReading } from "@/components/behavior/EvaluationPanel";
import { EventStrip } from "@/components/behavior/EventStrip";
import { SignalTable } from "@/components/behavior/SignalTable";
import { MOTION_CAPTCHAS, TrajectoryPanel } from "@/components/behavior/TrajectoryPanel";
import { analyzeSession } from "@/lib/behavior/analysis";
import { CHALLENGE_GENERATORS } from "@/lib/behavior/challenges";
import { classify } from "@/lib/behavior/classifier";
import type { SessionReport } from "@/lib/behavior/human";
import { observationText, observations } from "@/lib/behavior/observations";
import { syntheticDistribution, type SyntheticDistribution } from "@/lib/behavior/reference";
import {
  PROFILES_BY_CAPTCHA,
  defaultContext,
  defaultProfile,
  generateSyntheticSample,
  profileName,
  profileText,
} from "@/lib/behavior/synthetic";
import { BEHAVIOR_CAPTCHAS, isBehaviorCaptcha, type BehaviorCaptchaId, type BehaviorSample } from "@/lib/behavior/types";
import { catalogFor } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { useSeededChallenge } from "@/lib/useSeededChallenge";
import { AddToDataset } from "@/components/dataset/AddToDataset";
import { recordedRecord, syntheticRecord } from "@/lib/dataset/records";
import { definitionOfChallenge } from "@/lib/research/definition";
import { HumanTask } from "./HumanTask";

function CompareBody({ captchaId, challenge, onNewChallenge }: { captchaId: BehaviorCaptchaId; challenge: unknown; onNewChallenge: () => void }) {
  const t = useT();
  const [human, setHuman] = useState<SessionReport | null>(null);
  const [profile, setProfile] = useState(() => defaultProfile(captchaId));
  const [seed, setSeed] = useState(1);
  const [seedDraft, setSeedDraft] = useState("1");
  const [generated, setGenerated] = useState(false);
  const [distribution, setDistribution] = useState<SyntheticDistribution | null>(null);
  const [readings, setReadings] = useState<ProfileReading[] | null>(null);
  // A new or cleared human attempt changes the layout the synthetic side is measured in: drop derived results.
  const onResult = useCallback((r: SessionReport) => {
    setHuman(r);
    setDistribution(null);
    setReadings(null);
  }, []);
  const onReset = useCallback(() => {
    setHuman(null);
    setDistribution(null);
    setReadings(null);
  }, []);

  const humanSample = useMemo<BehaviorSample | null>(() => {
    if (!human) return null;
    try {
      return { origin: "human", captchaId, session: human.session, context: human.context, vector: analyzeSession(captchaId, challenge, human.session, human.context) };
    } catch (err) {
      console.error("Human sample analysis failed", err instanceof Error ? err.message : "unknown error");
      return null;
    }
  }, [human, captchaId, challenge]);

  // The synthetic sample is measured in the human's layout when there is one, on the SAME challenge object.
  const synthetic = useMemo<BehaviorSample | null>(() => {
    if (!generated) return null;
    try {
      return generateSyntheticSample({ captchaId, profile, challenge, context: human?.context, seed });
    } catch (err) {
      console.error("Synthetic sample failed", err instanceof Error ? err.message : "unknown error");
      return null;
    }
  }, [generated, captchaId, profile, challenge, human, seed]);

  const humanClass = useMemo(() => (humanSample ? classify(humanSample.vector) : null), [humanSample]);
  const syntheticClass = useMemo(() => (synthetic ? classify(synthetic.vector) : null), [synthetic]);
  const notes = useMemo(() => (humanSample && synthetic ? observations(humanSample.vector, synthetic.vector) : []), [humanSample, synthetic]);

  const config = (challenge as { config?: ChallengeConfig }).config;
  const definition = useMemo(() => definitionOfChallenge(captchaId, challenge), [captchaId, challenge]);
  const motion = MOTION_CAPTCHAS.includes(captchaId);
  const profiles = PROFILES_BY_CAPTCHA[captchaId];
  const randomProfile = profiles.find((p) => p.id === profile)?.random ?? false;
  const syntheticName = profileName(captchaId, profile, t);

  const commitSeed = (text: string): void => {
    setSeedDraft(text);
    if (/^\d{1,10}$/.test(text.trim()) && Number(text.trim()) <= 0xffffffff) {
      setSeed(Number(text.trim()));
      setDistribution(null);
      setReadings(null);
    }
  };

  const runDistribution = (): void => {
    try {
      setDistribution(syntheticDistribution({ captchaId, profile, challenge, context: human?.context ?? defaultContext(captchaId) }, seed));
    } catch (err) {
      setDistribution(null);
      console.error("Distribution failed", err instanceof Error ? err.message : "unknown error");
    }
  };

  const runReadings = (): void => {
    try {
      const context = human?.context ?? defaultContext(captchaId);
      setReadings(
        profiles.map((p) => ({
          profile: p.id,
          label: classify(generateSyntheticSample({ captchaId, profile: p.id, challenge, context, seed }).vector).label,
        })),
      );
    } catch (err) {
      setReadings(null);
      console.error("Profile readings failed", err instanceof Error ? err.message : "unknown error");
    }
  };

  const maxT = Math.max(human?.session.durationMs ?? 0, synthetic?.session.durationMs ?? 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ChallengeConfigCard captcha={captchaId} config={config} />
        <p className="text-xs text-muted" data-testid="compare-same-config">
          {t(
            "Cả hai bên chạy cùng một cấu hình thử thách (CAPTCHA, biến thể, độ khó và seed ở trên); so sánh chỉ có nghĩa khi hai bên cùng cấu hình.",
            "Both sides run the same challenge configuration (CAPTCHA, variant, difficulty and seed above); the comparison only means something when they match.",
          )}
        </p>
      </div>
      <section aria-labelledby="human-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="human-h" className="mb-1 text-base font-semibold">
          {t("1. Lần thử của bạn", "1. Your attempt")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "Làm thử thách ở dưới. Lần thử được ghi ngay trên máy bạn, giống như ở trang riêng của thử thách. Phần mô phỏng ở bước 2 chạy được dù bạn chưa thử.",
            "Complete the challenge below. It is recorded locally, like on the challenge's own page. The synthetic side in step 2 works without making an attempt.",
          )}
        </p>
        <HumanTask captchaId={captchaId} challenge={challenge} onNewChallenge={onNewChallenge} onResult={onResult} onReset={onReset} />
      </section>

      <section aria-labelledby="synthetic-h" className="rounded-lg border border-line bg-panel p-4">
        <h2 id="synthetic-h" className="mb-1 text-base font-semibold">
          {t("2. Mẫu mô phỏng", "2. Synthetic profile")}
        </h2>
        <p className="mb-3 text-sm text-muted">
          {t(
            "Phiên mô phỏng là dữ liệu được sinh ra: một bản ghi tương tác hợp lệ đưa vào cùng các bộ trích xuất chỉ số. Không có sự kiện trình duyệt nào được tạo hay phát đi, không có trang bên thứ ba nào bị chạm tới, và không có gì được gửi ra ngoài.",
            "A synthetic session is generated data: a valid interaction record fed to the same feature extractors. No browser event is created or dispatched, no third-party site is touched, and nothing is sent anywhere.",
          )}
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">{t("Mẫu mô phỏng", "Synthetic profile")}</legend>
          {profiles.map((p) => (
            <label key={p.id} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="profile"
                value={p.id}
                checked={profile === p.id}
                data-testid={`profile-${p.id}`}
                onChange={() => {
                  setProfile(p.id);
                  setDistribution(null);
                  setReadings(null);
                }}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{profileName(captchaId, p.id, t)}</span> <span className="text-muted">{profileText(captchaId, p.id, t)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="synthetic-seed" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              {t("Seed mô phỏng", "Synthetic seed")}
            </label>
            <input
              id="synthetic-seed"
              data-testid="synthetic-seed"
              inputMode="numeric"
              value={seedDraft}
              onChange={(e) => commitSeed(e.target.value)}
              className="w-32 rounded-md border border-line bg-bg px-3 py-1.5 font-mono text-sm"
            />
          </div>
          <button type="button" data-testid="generate" onClick={() => setGenerated(true)} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">
            {t("Tạo so sánh", "Generate comparison")}
          </button>
          {randomProfile && (
            <button
              type="button"
              data-testid="regenerate"
              onClick={() => {
                commitSeed(String(seed + 1));
                setGenerated(true);
              }}
              className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium hover:bg-track"
            >
              {t("Tạo biến thể khác", "Generate another variation")}
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="ds-add-h" className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="compare-dataset">
        <h2 id="ds-add-h" className="text-base font-semibold">{t("Thêm vào bộ dữ liệu có nhãn (tuỳ chọn)", "Add to the labeled dataset (optional)")}</h2>
        <p className="text-xs text-muted">{t("Không có gì được thêm tự động. Phiên của bạn vào bộ dữ liệu với nhãn “Chưa rõ”; bạn có thể tự đổi thành “Người” ở trang bộ dữ liệu. Mẫu mô phỏng vào với nhãn “Mô phỏng” cố định.", "Nothing is added automatically. Your session enters the dataset as Unknown; you can set it to Human yourself on the dataset page. A synthetic sample enters as Synthetic, fixed.")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <AddToDataset
            testId="add-recorded"
            label={t("Thêm phiên của tôi vào bộ dữ liệu", "Add my session to the dataset")}
            hint={t("Nhãn: Chưa rõ", "Label: Unknown")}
            disabled={!human || !definition}
            build={() => (human && definition ? recordedRecord({ definition, session: human.session, context: human.context, passed: human.passed }) : null)}
          />
          <AddToDataset
            testId="add-synthetic"
            label={t("Thêm mẫu mô phỏng vào bộ dữ liệu", "Add the synthetic sample to the dataset")}
            hint={t("Nhãn: Mô phỏng (cố định)", "Label: Synthetic (fixed)")}
            disabled={!synthetic || !definition}
            build={() => (synthetic?.synthetic && definition ? syntheticRecord({ definition, session: synthetic.session, context: synthetic.context, meta: synthetic.synthetic }) : null)}
          />
        </div>
      </section>

      {!synthetic && (
        <p className="text-sm text-muted" data-testid="compare-pending">
          {t("Bấm “Tạo so sánh” để tạo mẫu mô phỏng cho đúng thử thách này và đặt cạnh lần thử của bạn.", "Press “Generate comparison” to create a synthetic sample for this exact challenge and set it beside your attempt.")}
        </p>
      )}

      {synthetic && (
        <>
          <section aria-labelledby="result-h" className="space-y-4" data-testid="compare-result">
            <h2 id="result-h" className="text-base font-semibold">
              {t("3. Điểm khác biệt", "3. Differences")}
            </h2>
            <p className="text-xs text-muted" data-testid="synthetic-meta">
              {t("Mẫu mô phỏng", "Synthetic profile")}: <span className="font-medium">{syntheticName}</span> · {t("Phiên bản bộ sinh", "Generator version")}:{" "}
              <span className="font-mono">{synthetic.synthetic?.generator}</span> · {t("Seed mô phỏng", "Synthetic seed")}: <span className="font-mono">{synthetic.synthetic?.seed}</span>
            </p>

            {motion ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card id="human-traj-h" title={t("Đường đi của bạn", "Your trajectory")}>
                  {humanSample ? (
                    <TrajectoryPanel captchaId={captchaId as "slider" | "drag-drop" | "rotation"} challenge={challenge} session={humanSample.session} context={humanSample.context} label={t("Đường đi của lần thử của bạn", "Pointer path of your attempt")} testId="traj-human" />
                  ) : (
                    <p className="text-sm text-muted" data-testid="human-empty">{t("Hãy thử ở trên để xem kết quả ở đây.", "Make an attempt above to see it here.")}</p>
                  )}
                </Card>
                <Card id="syn-traj-h" title={t(`Đường đi mô phỏng (${syntheticName})`, `Synthetic trajectory (${syntheticName})`)}>
                  <TrajectoryPanel captchaId={captchaId as "slider" | "drag-drop" | "rotation"} challenge={challenge} session={synthetic.session} context={synthetic.context} label={t(`Đường đi mô phỏng ${syntheticName}`, `Pointer path of the synthetic ${syntheticName} sample`)} testId="traj-synthetic" />
                </Card>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card id="human-time-h" title={t("Dòng thời gian của bạn", "Your timeline")}>
                  {humanSample ? (
                    <EventStrip session={humanSample.session} maxT={maxT} label={t("Lần thử của bạn", "Your attempt")} testId="timeline-human" />
                  ) : (
                    <p className="text-sm text-muted" data-testid="human-empty">{t("Hãy thử ở trên để xem kết quả ở đây.", "Make an attempt above to see it here.")}</p>
                  )}
                </Card>
                <Card id="syn-time-h" title={t(`Dòng thời gian mô phỏng (${syntheticName})`, `Synthetic timeline (${syntheticName})`)}>
                  <EventStrip session={synthetic.session} maxT={maxT} label={t(`Mẫu mô phỏng ${syntheticName}`, `Synthetic ${syntheticName} sample`)} testId="timeline-synthetic" />
                </Card>
              </div>
            )}
            {!motion && (
              <p className="text-xs text-muted">
                {t("Chấm đặc: nhấn. Chấm rỗng: thả. Ô vuông: phím. Vạch mờ: di chuyển con trỏ. Hai dòng dùng cùng thang thời gian.", "Filled dot: press. Open dot: release. Square: key. Faint tick: pointer move. Both rows share one time scale.")}
              </p>
            )}

            <Card id="table-h" title={t("Các tín hiệu đã đo", "Measured signals")}>
              <SignalTable captchaId={captchaId} human={humanSample?.vector ?? null} synthetic={synthetic.vector} syntheticName={syntheticName} />
              <p className="mt-3 text-xs text-muted" data-testid="compare-note">
                {t(
                  "Đây là điểm khác nhau giữa hai bản ghi, không phải một phép phân loại. CaptchaLab không tính điểm bot và không khẳng định giá trị nào trong số này phân biệt được người với phần mềm; một người có thể kéo thẳng tắp và một chương trình có thể thêm nhiễu.",
                  "These are differences between two recordings, not a classification. CaptchaLab does not compute a bot score and does not claim that any of these values separates people from software; a person can drag in a straight line and a program can add noise.",
                )}
              </p>
            </Card>

            <Card id="obs-h" title={t("Quan sát mô tả", "Descriptive observations")}>
              {humanSample ? (
                notes.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="observations">
                    {notes.map((o) => (
                      <li key={o.signal}>{observationText(o, t)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted" data-testid="observations">{t("Không có khác biệt nào đủ lớn để nêu ở hai mẫu này.", "No difference between these two samples is large enough to mention.")}</p>
                )
              ) : (
                <p className="text-sm text-muted" data-testid="observations">{t("Cần một lần thử của bạn để so sánh.", "An attempt of yours is needed to compare.")}</p>
              )}
              <p className="mt-2 text-xs text-muted">{t("Các câu này chỉ mô tả hai bản ghi này, không nói về cách người hay chương trình nói chung hành xử.", "These sentences describe these two recordings only, not how people or programs behave in general.")}</p>
            </Card>
          </section>

          <section aria-labelledby="class-h" className="space-y-4" data-testid="behavior-classification">
            <h2 id="class-h" className="text-base font-semibold">
              {t("4. Phân loại thử nghiệm", "4. Experimental classification")}
            </h2>
            <ClassifierDisclaimer />
            <div className="grid gap-4 lg:grid-cols-2">
              <ClassificationCard title={t("Mẫu của bạn", "Your sample")} classification={humanClass} testId="class-human" />
              <ClassificationCard title={t(`Mẫu mô phỏng (${syntheticName})`, `Synthetic sample (${syntheticName})`)} classification={syntheticClass} testId="class-synthetic" />
            </div>
          </section>

          <DistributionPanel distribution={distribution} human={humanSample?.vector ?? null} onGenerate={runDistribution} />
          <EvaluationPanel captchaId={captchaId} readings={readings} onRun={runReadings} />
        </>
      )}
    </div>
  );
}

function CompareFor({ captchaId }: { captchaId: BehaviorCaptchaId }) {
  const t = useT();
  const { challenge, failed, round, newChallenge, choice, seed, setVariant, setDifficulty, setSeed } = useSeededChallenge(CHALLENGE_GENERATORS[captchaId], VARIANT_SETS[captchaId]);
  return (
    <>
      <ChallengeControls captcha={captchaId} variantSet={VARIANT_SETS[captchaId]} choice={choice} seed={seed} onVariant={setVariant} onDifficulty={setDifficulty} onSeed={setSeed} />
      {failed && (
        <p role="alert" className="text-sm text-bad">
          {t("Không tạo được thử thách. Hãy tải lại trang.", "Could not generate a challenge. Reload the page.")}
        </p>
      )}
      {challenge === null && !failed && <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p>}
      {challenge !== null && <CompareBody key={`${captchaId}:${round}`} captchaId={captchaId} challenge={challenge} onNewChallenge={newChallenge} />}
    </>
  );
}

export function ComparePlayground() {
  const t = useT();
  const [captchaId, setCaptchaId] = useState<BehaviorCaptchaId | null>(null);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("captcha");
    setCaptchaId(isBehaviorCaptcha(wanted) ? wanted : "slider");
  }, []);

  const choose = (next: BehaviorCaptchaId): void => {
    try {
      // Variant, difficulty and seed belong to the previous CAPTCHA.
      const url = new URL(window.location.href);
      for (const k of ["variant", "difficulty", "seed"]) url.searchParams.delete(k);
      url.searchParams.set("captcha", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // The URL is a convenience only.
    }
    setCaptchaId(next);
  };

  const names = useMemo(() => new Map(catalogFor(t).map((c) => [c.id, c.name])), [t]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("So sánh: người và mô phỏng", "Compare: human and synthetic")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Chọn một CAPTCHA, tự làm thử thách, rồi chọn một mẫu mô phỏng và xem các tín hiệu đo được khác nhau thế nào trên cùng một thử thách. Mọi thứ chạy ngay trong thẻ trình duyệt này, trên thử thách riêng của CaptchaLab.",
            "Pick a CAPTCHA, complete the challenge yourself, then pick a synthetic profile and look at how the measured signals differ on the same challenge. Everything runs in this browser tab on CaptchaLab's own challenges.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />
      <div>
        <label htmlFor="captcha-select" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          CAPTCHA
        </label>
        <select
          id="captcha-select"
          data-testid="captcha-select"
          value={captchaId ?? "slider"}
          onChange={(e) => {
            if (isBehaviorCaptcha(e.target.value)) choose(e.target.value);
          }}
          className="w-full max-w-xs rounded-md border border-line bg-bg px-3 py-2 text-sm"
        >
          {BEHAVIOR_CAPTCHAS.map((id) => (
            <option key={id} value={id}>
              {names.get(id) ?? id}
            </option>
          ))}
        </select>
      </div>
      {captchaId === null ? <p className="text-sm text-muted">{t("Đang tải…", "Loading…")}</p> : <CompareFor key={captchaId} captchaId={captchaId} />}
    </main>
  );
}
