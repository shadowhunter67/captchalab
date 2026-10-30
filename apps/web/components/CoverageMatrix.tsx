"use client";

import { useT } from "@/lib/i18n";
import { FAMILY_NAMES, countTaxonomy, taxonomyFor } from "@/lib/taxonomy";

/**
 * "Real-world CAPTCHA family coverage". Honest by construction: every cell is read from the taxonomy, an unsupported
 * cell says "—" in words, and the sentence above the table never claims full coverage.
 */
export function CoverageMatrix() {
  const t = useT();
  const entries = taxonomyFor(t);
  const counts = countTaxonomy(entries);
  const yes = t("Có", "Yes");
  const no = "—";
  const flag = (v: boolean): string => (v ? yes : no);
  return (
    <section id="coverage" aria-labelledby="coverage-h" className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="coverage-matrix">
      <h2 id="coverage-h" className="text-lg font-semibold">{t("Độ phủ các họ CAPTCHA ngoài đời thực", "Real-world CAPTCHA family coverage")}</h2>
      <p className="text-muted" data-testid="coverage-claim">
        {t(
          "CaptchaLab bao quát các họ thử thách CAPTCHA và chống lạm dụng chính thông qua các bản cài đặt giáo dục mang tính tổng quát.",
          "CaptchaLab covers major CAPTCHA and anti-abuse challenge families through generic educational implementations.",
        )}
      </p>
      <p className="text-xs text-muted" data-testid="coverage-counts">
        {t(
          `${counts.total} mục: ${counts.captchas} CAPTCHA, ${counts.systems} kiểm tra môi trường, ${counts.labs} phòng thí nghiệm ghép. Đây không phải toàn bộ các hệ thống CAPTCHA thương mại và không tái tạo cơ chế bên trong của chúng. “—” nghĩa là chưa hỗ trợ.`,
          `${counts.total} entries: ${counts.captchas} CAPTCHAs, ${counts.systems} environment check, ${counts.labs} composed labs. This is not every commercial CAPTCHA system and does not reproduce their internals. “—” means not supported.`,
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-xs">
          <caption className="sr-only">{t("Bảng độ phủ theo họ", "Coverage by family")}</caption>
          <thead>
            <tr className="border-b border-line">
              {[
                t("Thử thách / Phòng", "Challenge / Lab"),
                t("Họ", "Family"),
                t("Tương tác", "Interactive"),
                t("Biến thể", "Variants"),
                t("Độ khó", "Difficulty"),
                t("Phân tích", "Inspect"),
                t("Trình dựng", "Builder"),
                t("So sánh", "Compare"),
                t("Tín hiệu hành vi", "Behavioral signals"),
                t("Bộ phân loại", "Classifier"),
                t("Hồ sơ mô phỏng", "Synthetic profiles"),
              ].map((h) => (
                <th key={h} scope="col" className="py-1 pr-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-line/50" data-testid={`coverage-row-${e.id}`}>
                <th scope="row" className="py-1 pr-3 font-normal">{e.name}</th>
                <td className="py-1 pr-3">{t(FAMILY_NAMES[e.family][0], FAMILY_NAMES[e.family][1])}</td>
                <td className="py-1 pr-3" data-col="interactive">{flag(e.interactive)}</td>
                <td className="py-1 pr-3" data-col="variants">{e.variants ?? no}</td>
                <td className="py-1 pr-3" data-col="difficulty">{e.difficultyLevels ?? no}</td>
                <td className="py-1 pr-3" data-col="inspect">{flag(e.inspect)}</td>
                <td className="py-1 pr-3" data-col="builder">{flag(e.builder)}</td>
                <td className="py-1 pr-3" data-col="compare">{flag(e.compare)}</td>
                <td className="py-1 pr-3" data-col="signals">{flag(e.behavioralSignals)}</td>
                <td className="py-1 pr-3" data-col="classifier">{t("Bộ phân loại: ", "Classifier support: ")}{flag(e.classifier)}</td>
                <td className="py-1 pr-3" data-col="synthetic">{flag(e.syntheticProfiles)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
