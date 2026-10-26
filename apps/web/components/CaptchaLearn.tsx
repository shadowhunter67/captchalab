"use client";

import { catalogFor, type CatalogEntry } from "@/lib/catalog";
import { useT } from "@/lib/i18n";

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-muted">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** The Learn block under a playground, built from the catalog so it matches the /learn page (all eight sections). */
export function CaptchaLearn({ id }: { id: CatalogEntry["id"] }) {
  const t = useT();
  const c = catalogFor(t).find((e) => e.id === id);
  if (!c) return null;
  return (
    <section aria-labelledby="learn-h" className="space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="learn">
      <h2 id="learn-h" className="text-base font-semibold">
        {t(`Tìm hiểu: ${c.name}`, `Learn: ${c.name}`)}
      </h2>
      <p className="text-muted">
        {t(
          "CaptchaLab minh hoạ các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Nó không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại.",
          "CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems.",
        )}
      </p>
      <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
      <p className="text-muted">{c.learn.howItWorks}</p>
      <h3 className="font-semibold">{t("Cách tạo thử thách", "Generation")}</h3>
      <p className="text-muted">{c.learn.generation}</p>
      <h3 className="font-semibold">{t("Biến thể và độ khó", "Variants & difficulty")}</h3>
      <p className="text-muted">{c.variantsNote}</p>
      <h3 className="font-semibold">{t("Cách xác minh", "Verification")}</h3>
      <p className="text-muted">{c.learn.verification}</p>
      <h3 className="font-semibold">{t("Tín hiệu hành vi", "Behavioral signals")}</h3>
      <List items={c.learn.signals} />
      <p className="text-muted">
        {t("Đây chỉ là mô tả một lần tương tác, không phải quy tắc để phân biệt người với phần mềm.", "These are descriptions of one interaction, not rules for telling people from software.")}
      </p>
      <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
      <List items={c.learn.strengths} />
      <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
      <List items={c.learn.weaknesses} />
      <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
      <p className="text-muted">{c.learn.accessibility}</p>
      <h3 className="font-semibold">{t("Về việc tự động hoá", "Automation considerations")}</h3>
      <p className="text-muted">{c.learn.automation}</p>
    </section>
  );
}
