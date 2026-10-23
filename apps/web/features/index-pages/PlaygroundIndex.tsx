"use client";

import Link from "next/link";
import { catalogFor } from "@/lib/catalog";
import { useT } from "@/lib/i18n";

export function PlaygroundIndex() {
  const t = useT();
  const catalog = catalogFor(t);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Sân thử", "Playground")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Sáu thử thách trong phòng thí nghiệm. Mỗi thử thách ghi lại tương tác của bạn ngay trên máy, hiển thị các chỉ số đo được và cho bạn phân tích từng sự kiện.",
            "Six lab challenges. Each one records your interaction locally, shows the measured features and lets you inspect the events.",
          )}
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2" data-testid="playground-cards">
        {catalog.map((c) => (
          <li key={c.id} className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-base font-semibold">{c.name}</h2>
            <p className="mt-1 text-sm text-muted">{c.summary}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href={c.route} data-testid={`open-${c.id}`} className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg hover:opacity-90">
                {t("Mở ", "Open ")}
                {c.name}
              </Link>
              <Link href={`/learn#${c.id}`} className="py-1.5 underline">
                {t("Tìm hiểu", "Learn")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        <Link href="/compare" className="underline">
          {t("So sánh một lần kéo của người với một lần kéo tổng hợp", "Compare a human drag with a synthetic one")}
        </Link>
      </p>
    </main>
  );
}
