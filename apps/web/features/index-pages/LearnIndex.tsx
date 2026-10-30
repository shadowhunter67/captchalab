"use client";

import Link from "next/link";
import { catalogFor } from "@/lib/catalog";
import { CoverageMatrix } from "@/components/CoverageMatrix";
import { labLearnFor } from "@/lib/lab-learn";
import { FAMILIES, FAMILY_NAMES, taxonomyFor, type LabId } from "@/lib/taxonomy";
import { BehavioralLearn } from "./BehavioralLearn";
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

export function LearnIndex() {
  const t = useT();
  const catalog = catalogFor(t);
  const entries = taxonomyFor(t);
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">
          CaptchaLab
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Tìm hiểu", "Learn")}</h1>
        <p className="mt-1 text-sm text-muted" data-testid="learn-disclaimer">
          {t(
            "CaptchaLab minh hoạ các tín hiệu mà một hệ thống CAPTCHA có thể dùng. Nó không tuyên bố tái tạo đầy đủ cơ chế bên trong của các hệ thống CAPTCHA thương mại. Các số đo chỉ mô tả một lần tương tác; chúng không phải bằng chứng cho thấy do người hay phần mềm thực hiện, và các bộ xác minh demo không phải là bảo mật cho sản phẩm thật.",
            "CaptchaLab illustrates signals that a CAPTCHA system may use. It does not claim to reproduce the complete internal mechanisms of commercial CAPTCHA systems. Measurements describe one interaction; they are not evidence that it was made by a person or by software, and the demo verifiers are not production security.",
          )}
        </p>
        <nav aria-label={t("Họ", "Families")} className="mt-3 flex flex-wrap gap-3 text-sm" data-testid="learn-families">
          {FAMILIES.map((f) => (
            <a key={f} href={`#family-${f}`} className="font-medium underline">
              {t(FAMILY_NAMES[f][0], FAMILY_NAMES[f][1])}
            </a>
          ))}
          <a href="#coverage" className="underline">{t("Độ phủ", "Coverage")}</a>
          <a href="#behavioral" className="underline">
            {t("Hành vi / vô hình", "Behavioral / Invisible")}
          </a>
        </nav>
        <nav aria-label="CAPTCHAs" className="mt-2 flex flex-wrap gap-3 text-sm">
          {catalog.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="text-muted underline">
              {c.name}
            </a>
          ))}
        </nav>
      </header>
      {FAMILIES.map((f) => {
        const familyCatalog = catalog.filter((c) => entries.find((e) => e.id === c.id)?.family === f);
        const familyLabs = entries.filter((e) => e.family === f && e.kind === "lab");
        return (
          <div key={f} id={`family-${f}`} className="scroll-mt-4 space-y-4" data-testid={`learn-family-${f}`}>
            <h2 className="text-xl font-semibold">{t(FAMILY_NAMES[f][0], FAMILY_NAMES[f][1])}</h2>
        {familyCatalog.map((c) => (
        <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid={`learn-${c.id}`}>
          <h3 id={`${c.id}-h`} className="text-lg font-semibold">
            {c.name}
          </h3>
          <h3 className="font-semibold">{t("Cách hoạt động", "How it works")}</h3>
          <p className="text-muted">{c.learn.howItWorks}</p>
          <h3 className="font-semibold">{t("Cách tạo thử thách", "Generation")}</h3>
          <p className="text-muted">{c.learn.generation}</p>
          <h3 className="font-semibold">{t("Cách xác minh", "Verification")}</h3>
          <p className="text-muted">{c.learn.verification}</p>
          <h3 className="font-semibold">{t("Biến thể và độ khó", "Variants & difficulty")}</h3>
          <p className="text-muted" data-testid={`variants-${c.id}`}>{c.variantsNote}</p>
          <h3 className="font-semibold">{t("Tín hiệu hành vi", "Behavioral signals")}</h3>
          <List items={c.learn.signals} />
          <h3 className="font-semibold">{t("Điểm mạnh", "Strengths")}</h3>
          <List items={c.learn.strengths} />
          <h3 className="font-semibold">{t("Điểm yếu", "Weaknesses")}</h3>
          <List items={c.learn.weaknesses} />
          <h3 className="font-semibold">{t("Khả năng tiếp cận", "Accessibility")}</h3>
          <p className="text-muted">{c.learn.accessibility}</p>
          <h3 className="font-semibold">{t("Về việc tự động hoá", "Automation considerations")}</h3>
          <p className="text-muted">{c.learn.automation}</p>
          <p>
            <Link href={c.route} className="underline">
              {t(`Mở sân thử ${c.name}`, `Open the ${c.name} playground`)}
            </Link>
          </p>
        </section>
      ))}
            {familyLabs.map((l) => {
              const lab = labLearnFor(l.id as LabId, t);
              return (
                <section key={l.id} id={l.id} aria-labelledby={`${l.id}-h`} className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4 text-sm" data-testid={`learn-lab-${l.id}`}>
                  <h3 id={`${l.id}-h`} className="text-lg font-semibold">{l.name}</h3>
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
                  <p>
                    <Link href={l.route} className="underline">{t(`Mở ${l.name}`, `Open ${l.name}`)}</Link>
                  </p>
                </section>
              );
            })}
          </div>
        );
      })}
      <CoverageMatrix />
      <BehavioralLearn />
    </main>
  );
}
