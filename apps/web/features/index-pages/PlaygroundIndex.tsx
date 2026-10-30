"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { FAMILIES, FAMILY_NAMES, countTaxonomy, taxonomyFor } from "@/lib/taxonomy";

export function PlaygroundIndex() {
  const t = useT();
  const entries = taxonomyFor(t);
  const counts = countTaxonomy(entries);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Sân thử", "Playground")}</h1>
        <p className="mt-1 text-sm text-muted" data-testid="playground-count">
          {t(
            `${counts.total} mục trong phòng thí nghiệm, chia theo họ: ${counts.captchas} CAPTCHA, ${counts.systems} kiểm tra môi trường và ${counts.labs} phòng thí nghiệm ghép. Mỗi mục ghi lại tương tác của bạn ngay trên máy, hiển thị các chỉ số đo được và cho bạn phân tích từng sự kiện.`,
            `${counts.total} lab entries in families: ${counts.captchas} CAPTCHAs, ${counts.systems} environment check and ${counts.labs} composed labs. Each one records your interaction locally, shows the measured features and lets you inspect the events.`,
          )}
        </p>
        <nav aria-label={t("Họ", "Families")} className="mt-3 flex flex-wrap gap-3 text-sm" data-testid="playground-families">
          {FAMILIES.map((f) => (
            <a key={f} href={`#family-${f}`} className="underline">
              {t(FAMILY_NAMES[f][0], FAMILY_NAMES[f][1])} ({counts.byFamily[f]})
            </a>
          ))}
        </nav>
      </header>
      <div className="space-y-6" data-testid="playground-cards">
        {FAMILIES.map((f) => (
          <section key={f} id={`family-${f}`} aria-labelledby={`family-${f}-h`} className="scroll-mt-4 space-y-3" data-testid={`family-${f}`}>
            <h2 id={`family-${f}-h`} className="text-lg font-semibold">{t(FAMILY_NAMES[f][0], FAMILY_NAMES[f][1])}</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {entries.filter((e) => e.family === f).map((c) => (
                <li key={c.id} className="rounded-lg border border-line bg-panel p-4">
                  <h3 className="text-base font-semibold">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted">{c.summary}</p>
                  <p className="mt-1 text-xs text-muted" data-testid={`variants-count-${c.id}`}>
                    {c.kind === "lab"
                      ? t("Phòng thí nghiệm ghép", "Composed lab")
                      : t(`${c.variants} biến thể · ${c.difficultyLevels} mức độ khó`, `${c.variants} ${c.variants === 1 ? "variant" : "variants"} · ${c.difficultyLevels} difficulty ${c.difficultyLevels === 1 ? "level" : "levels"}`)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <Link href={c.route} data-testid={`open-${c.id}`} className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg hover:opacity-90">
                      {t("Mở ", "Open ")}
                      {c.name}
                    </Link>
                    <Link href={c.kind === "lab" ? "/learn#coverage" : `/learn#${c.id}`} className="py-1.5 underline">
                      {t("Tìm hiểu", "Learn")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-sm">
        <Link href="/learn#coverage" className="underline" data-testid="playground-coverage-link">
          {t("Độ phủ các họ CAPTCHA", "CAPTCHA family coverage")}
        </Link>
        {" · "}
        <Link href="/compare" className="underline">
          {t("So sánh một lần thử của người với một mẫu mô phỏng", "Compare a human attempt with a synthetic one")}
        </Link>
        {" · "}
        <Link href="/behavior" className="underline" data-testid="playground-behavior-link">
          {t("Phòng thí nghiệm hành vi", "Behavioral Lab")}
        </Link>
      </p>
    </main>
  );
}
