"use client";

import { Card } from "@/components/inspect/Card";
import { CLASSIFIER_VERSION, LABEL_TEXT, type ClassificationLabel } from "@/lib/behavior/classifier";
import { profileName } from "@/lib/behavior/synthetic";
import type { BehaviorCaptchaId } from "@/lib/behavior/types";
import { useT } from "@/lib/i18n";

export interface ProfileReading {
  profile: string;
  label: ClassificationLabel;
}

interface Props {
  captchaId: BehaviorCaptchaId;
  readings: readonly ProfileReading[] | null;
  onRun: () => void;
}

/**
 * Says plainly that the classifier is experimental, and shows how it reads each GENERATED profile on this
 * challenge. That is a fixture check of a rule baseline, not an accuracy figure: there is no labeled human data
 * here, so no population accuracy or confusion matrix is shown.
 */
export function EvaluationPanel({ captchaId, readings, onRun }: Props) {
  const t = useT();
  return (
    <Card id="evaluation-h" title={t("Đánh giá bộ phân loại", "Classifier evaluation")}>
      <div className="space-y-3 text-sm text-muted">
        <p data-testid="evaluation-experimental">{t("Bộ phân loại này mang tính thử nghiệm.", "This classifier is experimental.")}</p>
        <p>
          {t(
            `Phiên bản ${CLASSIFIER_VERSION} là một bộ quy tắc theo từng CAPTCHA với các khoảng chuẩn hoá do người viết đặt tay, không học từ dữ liệu người thật. Vì chưa có tập dữ liệu người được gán nhãn, CaptchaLab không hiển thị độ chính xác hay ma trận nhầm lẫn theo quần thể.`,
            `Version ${CLASSIFIER_VERSION} is a per-CAPTCHA rule set with normalization ranges set by hand, not learned from real people. Because there is no labeled human dataset, CaptchaLab shows no accuracy figure or population confusion matrix.`,
          )}
        </p>
        <button type="button" data-testid="evaluation-run" onClick={onRun} className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-medium text-fg hover:bg-track">
          {t("Cho bộ phân loại đọc mọi mẫu mô phỏng trên thử thách này", "Let the classifier read every synthetic profile on this challenge")}
        </button>
        {readings && (
          <div className="overflow-x-auto" data-testid="evaluation-readings">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t("Cách bộ phân loại đọc từng mẫu mô phỏng", "How the classifier reads each synthetic profile")}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-1 pr-3 font-medium">{t("Mẫu mô phỏng", "Synthetic profile")}</th>
                  <th scope="col" className="py-1 font-medium">{t("Bộ phân loại đọc là", "The classifier reads it as")}</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.profile} className="border-b border-line/50" data-testid={`reading-${r.profile}`}>
                    <th scope="row" className="py-1 pr-3 font-normal">{profileName(captchaId, r.profile, t)}</th>
                    <td className="py-1">{t(LABEL_TEXT[r.label][1], LABEL_TEXT[r.label][0])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs">
              {t(
                "Một mẫu mô phỏng được đọc là \"Giống người\" nghĩa là các quy tắc này không phân biệt được nó, không phải là nó đúng là người.",
                "A synthetic profile read as \"Human-like\" means these rules cannot tell it apart, not that it is a person.",
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
