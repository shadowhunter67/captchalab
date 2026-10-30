"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

type Page = "experiments" | "dataset" | "evaluation";

/** The three pages of the experiment workflow, one step apart: sessions, the labeled dataset, the evaluation. */
export function ExperimentsNav({ current }: { current: Page }) {
  const t = useT();
  const items: readonly { id: Page; href: string; label: string }[] = [
    { id: "experiments", href: "/experiments", label: t("Thí nghiệm", "Experiments") },
    { id: "dataset", href: "/experiments/dataset", label: t("Bộ dữ liệu", "Dataset") },
    { id: "evaluation", href: "/experiments/evaluation", label: t("Đánh giá", "Evaluation") },
  ];
  return (
    <nav aria-label={t("Quy trình thí nghiệm", "Experiment workflow")} className="mt-2 flex flex-wrap gap-2 text-sm" data-testid="experiments-nav">
      {items.map((i) => (
        <Link
          key={i.id}
          prefetch={false}
          href={i.href}
          aria-current={i.id === current ? "page" : undefined}
          data-testid={`experiments-nav-${i.id}`}
          className={`rounded-md border px-2.5 py-1 ${i.id === current ? "border-accent bg-track font-medium" : "border-line bg-panel hover:bg-track"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
