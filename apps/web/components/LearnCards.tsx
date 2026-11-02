"use client";

import Link from "next/link";
import { labLearnFor } from "@/lib/lab-learn";
import { realismFor } from "@/lib/realism";
import { useT } from "@/lib/i18n";
import type { LabId, PluginId } from "@/lib/taxonomy";

/** How a challenge resembles its real-world family and what is intentionally not cloned (from lib/realism.ts). */
export function RealismBlock({ id }: { id: PluginId }) {
  const t = useT();
  const r = realismFor(id, t);
  return (
    <div data-testid={`learn-realism-${id}`} data-level={r.level}>
      <h3 className="font-semibold">{t("Giống thử thách thật ở đâu", "How it resembles the real thing")}</h3>
      <p className="text-muted">
        <strong>{t("Họ thử thách: ", "Family: ")}</strong>
        {r.family}. {r.approximation}
      </p>
      <p className="mt-1 text-muted">
        <strong>{t("Cố ý không sao chép: ", "Intentionally not cloned: ")}</strong>
        {r.limits}
      </p>
    </div>
  );
}

/** The Learn card of a composed lab (Hybrid, Invisible, Adaptive). `route` adds the "open" link used by the Learn index. */
export function LabLearnCard({ id, name, route }: { id: LabId; name: string; route?: string }) {
  const t = useT();
  const lab = labLearnFor(id, t);
  return (
    <section aria-labelledby={`${id}-h`} id={route ? id : undefined} className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid={route ? `learn-lab-${id}` : "learn"}>
      <h3 id={`${id}-h`} className="text-lg font-semibold">
        {name}
      </h3>
      <h4 className="font-semibold">{t("Đây là gì", "What it is")}</h4>
      <p className="text-muted">{lab.what}</p>
      <h4 className="font-semibold">{t("CaptchaLab cài đặt thế nào", "How CaptchaLab implements it")}</h4>
      <p className="text-muted">{lab.how}</p>
      <h4 className="font-semibold">{t("Nó đo gì", "What it measures")}</h4>
      <p className="text-muted">{lab.measures}</p>
      <h4 className="font-semibold">{t("Nó KHÔNG chứng minh điều gì", "What it does NOT prove")}</h4>
      <p className="text-muted">{lab.notProve}</p>
      <h4 className="font-semibold">{t("Quyền riêng tư", "Privacy")}</h4>
      <p className="text-muted">{lab.privacy}</p>
      <h4 className="font-semibold">{t("Giới hạn", "Limitations")}</h4>
      <p className="text-muted">{lab.limits}</p>
      {route && (
        <p>
          <Link href={route} className="underline">
            {t(`Mở ${name}`, `Open ${name}`)}
          </Link>
        </p>
      )}
    </section>
  );
}
