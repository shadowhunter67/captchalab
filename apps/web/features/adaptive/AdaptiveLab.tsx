"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClassificationCard, ClassifierDisclaimer } from "@/components/behavior/ClassificationCard";
import { ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { Card } from "@/components/inspect/Card";
import { ADAPTIVE_PROFILES, adaptiveFor, adaptiveTable } from "@/lib/adaptive/adaptive";
import { LABEL_TEXT } from "@/lib/behavior/classifier";
import { INVISIBLE_PROFILE_TEXT, type InvisibleProfile } from "@/lib/behavior/invisible";
import { useT } from "@/lib/i18n";

/**
 * Adaptive Lab: a generated example goes through the SAME experimental classifier as the Behavioral Lab, and the
 * resulting label shows the SAME simulated suggestion. It adds no rule of its own, keeps nothing, and never blocks
 * or redirects: the suggested demo is only a link.
 */
export function AdaptiveLab() {
  const t = useT();
  const [profile, setProfile] = useState<InvisibleProfile | null>(null);
  const outcome = useMemo(() => (profile ? adaptiveFor(profile) : null), [profile]);
  const table = adaptiveTable();
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">CaptchaLab</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Phòng thí nghiệm thích ứng", "Adaptive Lab")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Một hệ thống dựa trên rủi ro có thể chọn thử thách tiếp theo theo kết quả phân loại hành vi. Ở đây bạn chọn một ví dụ mô phỏng và xem gợi ý tương ứng.",
            "A risk-based system might pick the next challenge from a behavioral classification. Here you pick a generated example and see the matching suggestion.",
          )}
        </p>
      </header>
      <ResearchDisclaimer />
      <p className="rounded-lg border border-line bg-panel p-3 text-xs text-muted" data-testid="adaptive-scope">
        {t(
          "Phòng này chỉ dùng bộ phân loại thử nghiệm sẵn có của Phòng thí nghiệm hành vi, không thêm luật nào. Không ghi gì từ bạn, không lưu, không gửi đi, không chặn hay chuyển hướng.",
          "This lab only uses the Behavioral Lab's existing experimental classifier and adds no rule. Nothing is recorded from you, stored or sent, and nothing is blocked or redirected.",
        )}
      </p>

      <Card id="adaptive-pick-h" title={t("Chọn một ví dụ mô phỏng (dữ liệu được sinh ra)", "Pick a synthetic example (generated data)")}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Mẫu mô phỏng", "Synthetic profile")}>
          {ADAPTIVE_PROFILES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={profile === p}
              data-testid={`adaptive-profile-${p}`}
              title={t(INVISIBLE_PROFILE_TEXT[p].descVi, INVISIBLE_PROFILE_TEXT[p].descEn)}
              onClick={() => setProfile(p)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${profile === p ? "border-accent bg-track" : "border-line bg-panel hover:bg-track"}`}
            >
              {t(INVISIBLE_PROFILE_TEXT[p].vi, INVISIBLE_PROFILE_TEXT[p].en)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {t("Muốn thử bằng chính tương tác của bạn? ", "Want to try it with your own interaction? ")}
          <Link href="/playground/invisible" className="underline" data-testid="adaptive-to-invisible">{t("Mở Phòng thí nghiệm vô hình", "Open the Invisible Lab")}</Link>.
        </p>
      </Card>

      {outcome && (
        <section aria-labelledby="adaptive-result-h" className="space-y-4" data-testid="adaptive-result">
          <h2 id="adaptive-result-h" className="text-base font-semibold">{t("Kết quả", "Result")}</h2>
          <ClassifierDisclaimer />
          <ClassificationCard title={t("Ví dụ mô phỏng", "Synthetic example")} classification={outcome.classification} testId="adaptive-class" />
          <Card id="adaptive-escalation-h" title={t("Gợi ý leo thang thử nghiệm", "Experimental escalation suggestion")}>
            <p role="status" aria-live="polite" className="text-sm" data-testid="adaptive-escalation" data-escalation={outcome.escalation.key} data-label={outcome.classification.label}>
              {t(outcome.escalation.vi, outcome.escalation.en)}
            </p>
            {outcome.escalation.href && (
              <p className="mt-2 text-sm">
                <Link href={outcome.escalation.href} className="underline" data-testid="adaptive-escalation-link">{t("Mở bản demo gợi ý (tuỳ chọn)", "Open the suggested demo (optional)")}</Link>
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              {t("Đây chỉ là mô phỏng, không phải một công cụ đánh giá rủi ro dùng thật.", "This is a simulation only, not a production risk engine.")}
            </p>
          </Card>
        </section>
      )}

      <Card id="adaptive-table-h" title={t("Bảng ánh xạ", "Mapping")}>
        <table className="w-full text-left text-sm" data-testid="adaptive-table">
          <caption className="sr-only">{t("Nhãn phân loại và gợi ý tương ứng", "Classification label and its suggestion")}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1 pr-3 font-medium">{t("Nhãn phân loại", "Classification")}</th>
              <th scope="col" className="py-1 font-medium">{t("Gợi ý", "Suggestion")}</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r.label} className="border-b border-line/50" data-testid={`adaptive-row-${r.label}`}>
                <th scope="row" className="py-1 pr-3 font-normal">{t(LABEL_TEXT[r.label][1], LABEL_TEXT[r.label][0])}</th>
                <td className="py-1">{t(r.escalation.vi, r.escalation.en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
