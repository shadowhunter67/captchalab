"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/inspect/Card";
import { ErrorsNote, ResearchDisclaimer } from "@/components/behavior/Disclaimers";
import { CLASSIFIER_VERSION } from "@/lib/behavior/classifier";
import { RULES_BY_CAPTCHA } from "@/lib/behavior/rules";
import { SIGNAL_CATALOG, SIGNALS_BY_CAPTCHA, groupLabel, signalDescription, signalLabel } from "@/lib/behavior/signal-catalog";
import { BEHAVIOR_CAPTCHAS, SIGNAL_GROUPS, isBehaviorCaptcha, type BehaviorCaptchaId } from "@/lib/behavior/types";
import { catalogFor } from "@/lib/catalog";
import { useT } from "@/lib/i18n";

const WHY: Record<BehaviorCaptchaId, readonly [string, string]> = {
  slider: ["Chuyển động liên tục", "Continuous motion"],
  "drag-drop": ["Chuyển động nhiều lần thử", "Multi-attempt motion"],
  checkbox: ["Kích hoạt rời rạc", "Discrete activation"],
  "image-grid": ["Nhiều lần bấm lặp lại", "Repeated clicks"],
  text: ["Nhịp gõ bàn phím", "Keyboard timing"],
  rotation: ["Tương tác theo góc", "Angular interaction"],
};

const cta = "inline-block rounded-md px-3 py-2 text-sm font-medium";

function Explorer() {
  const t = useT();
  const [id, setId] = useState<BehaviorCaptchaId>("slider");
  const names = new Map(catalogFor(t).map((c) => [c.id, c.name]));
  const signals = SIGNALS_BY_CAPTCHA[id];
  const rules = RULES_BY_CAPTCHA[id];
  return (
    <section id="signals" aria-labelledby="signals-h" className="scroll-mt-4 space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="signals-explorer">
      <h2 id="signals-h" className="text-base font-semibold">{t("Khám phá tín hiệu", "Explore signals")}</h2>
      <p className="text-sm text-muted">
        {t(
          "Mỗi CAPTCHA chỉ báo cáo những tín hiệu có nghĩa với kiểu tương tác của nó; không CAPTCHA nào phải có đủ mọi tín hiệu. Chọn một CAPTCHA để xem các tín hiệu và các khoảng chuẩn hoá do người viết đặt.",
          "Each CAPTCHA reports only the signals that mean something for its kind of interaction; none has to have them all. Pick one to see its signals and the normalization ranges the authors set.",
        )}
      </p>
      <div>
        <label htmlFor="explorer-select" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">CAPTCHA</label>
        <select
          id="explorer-select"
          data-testid="explorer-select"
          value={id}
          onChange={(e) => {
            if (isBehaviorCaptcha(e.target.value)) setId(e.target.value);
          }}
          className="w-full max-w-xs rounded-md border border-line bg-bg px-3 py-2 text-sm"
        >
          {BEHAVIOR_CAPTCHAS.map((c) => (
            <option key={c} value={c}>{names.get(c) ?? c}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="explorer-signals">
          <caption className="sr-only">{t("Các tín hiệu của CAPTCHA đã chọn", "Signals of the chosen CAPTCHA")}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1 pr-3 font-medium">{t("Nhóm", "Group")}</th>
              <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
              <th scope="col" className="py-1 font-medium">{t("Ý nghĩa", "Meaning")}</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const def = SIGNAL_CATALOG.find((d) => d.id === s);
              return (
                <tr key={s} className="border-b border-line/50">
                  <td className="py-1 pr-3 text-muted">{def ? groupLabel(def.group, t) : ""}</td>
                  <th scope="row" className="py-1 pr-3 font-normal">{signalLabel(s, t)}</th>
                  <td className="py-1 text-muted">{signalDescription(s, t)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3 className="pt-2 text-sm font-semibold">{t("Quy tắc của bộ phân loại cho CAPTCHA này", "Classifier rules for this CAPTCHA")}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="explorer-rules">
          <caption className="sr-only">{t("Các quy tắc và khoảng chuẩn hoá", "Rules and normalization ranges")}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-1 pr-3 font-medium">{t("Tín hiệu", "Signal")}</th>
              <th scope="col" className="py-1 pr-3 font-medium">{t("Khoảng cấu hình", "Configured range")}</th>
              <th scope="col" className="py-1 pr-3 font-medium">{t("Phía giống người", "Human-like end")}</th>
              <th scope="col" className="py-1 font-medium">{t("Trọng số", "Weight")}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.signal} className="border-b border-line/50">
                <th scope="row" className="py-1 pr-3 font-normal">{signalLabel(r.signal, t)}</th>
                <td className="py-1 pr-3 font-mono">{r.lo} – {r.hi}</td>
                <td className="py-1 pr-3">
                  {r.lowIsHuman ? t("giá trị thấp", "low values") : t("giá trị cao", "high values")}
                  {r.oneSided ? t(" (chỉ phía này mới có bằng chứng)", " (only this end counts as evidence)") : ""}
                </td>
                <td className="py-1 font-mono">{r.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {t("Các khoảng này do người viết đặt tay làm đường cơ sở, không học từ dữ liệu người thật; chúng không phải phân vị của quần thể.", "These ranges are set by hand as a baseline, not learned from real people; they are not population percentiles.")}
      </p>
    </section>
  );
}

export function BehaviorHome() {
  const t = useT();
  const names = new Map(catalogFor(t).map((c) => [c.id, c.name]));
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/" className="text-sm text-muted underline">CaptchaLab</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("Phòng thí nghiệm hành vi", "Behavioral Lab")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(
            "CaptchaLab thử nghiệm việc phân biệt các mẫu tương tác do chính phòng thí nghiệm sinh ra: ghi lại một lần thử của bạn, tính các tín hiệu hành vi, đặt cạnh một mẫu mô phỏng trên cùng thử thách và xem một bộ phân loại thử nghiệm đọc chúng ra sao.",
            "CaptchaLab experiments with distinguishing lab-generated interaction patterns: record one attempt of yours, compute behavioral signals, set it beside a synthetic sample on the same challenge and see how an experimental classifier reads them.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/compare?captcha=slider" data-testid="cta-record" className={`${cta} bg-accent text-bg hover:opacity-90`}>
            {t("Ghi một mẫu của người", "Record a human sample")}
          </Link>
          <Link href="/compare" data-testid="cta-compare" className={`${cta} border border-line bg-panel hover:bg-track`}>
            {t("So sánh với mô phỏng", "Compare with synthetic")}
          </Link>
          <a href="#signals" data-testid="cta-signals" className={`${cta} border border-line bg-panel hover:bg-track`}>
            {t("Khám phá tín hiệu", "Explore signals")}
          </a>
        </div>
      </header>

      <ResearchDisclaimer />

      <Card id="what-h" title={t("Phòng thí nghiệm làm gì", "What the lab does")}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>{t("Ghi tương tác ngay trong chính thử thách của CaptchaLab, ngay trên máy bạn.", "Records interaction inside CaptchaLab's own challenges, on your machine.")}</li>
          <li>{t("Tính các tín hiệu hành vi: thời gian, chuyển động, chỉnh sửa, nhịp và số lần thử.", "Computes behavioral signals: timing, motion, correction, rhythm and attempts.")}</li>
          <li>{t("So sánh mẫu của người với một mẫu mô phỏng được sinh ra trên đúng cùng thử thách.", "Compares a human sample with a generated synthetic one on exactly the same challenge.")}</li>
          <li>{t("Một bộ phân loại thử nghiệm chỉ cho ra Giống người, Giống mô phỏng hoặc Chưa rõ, kèm bằng chứng.", "An experimental classifier only says Human-like, Synthetic-like or Uncertain, with its evidence.")}</li>
        </ul>
        <p className="mt-3 text-sm text-muted" data-testid="behavior-not">
          {t(
            "Đây không phải hệ xác thực dùng thật. Mẫu mô phỏng chỉ được sinh ra dưới dạng dữ liệu cho thử thách của CaptchaLab; không có sự kiện trình duyệt nào được phát đi và không có trang bên thứ ba nào bị chạm tới.",
            "This is not a production authentication system. Synthetic samples are only generated as data for CaptchaLab's own challenges; no browser event is dispatched and no third-party site is touched.",
          )}
        </p>
      </Card>

      <Card id="supported-h" title={t("Sáu CAPTCHA được hỗ trợ", "Six supported CAPTCHAs")}>
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="behavior-supported">
          {BEHAVIOR_CAPTCHAS.map((id) => (
            <li key={id} className="rounded-md border border-line p-3 text-sm">
              <p className="font-medium">{names.get(id) ?? id}</p>
              <p className="text-muted">{t(WHY[id][0], WHY[id][1])}</p>
              <Link href={`/compare?captcha=${id}`} className="mt-1 inline-block underline" data-testid={`supported-${id}`}>
                {t("So sánh", "Compare")}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">{t("Các CAPTCHA còn lại (Ghi nhớ, Toán, Chuỗi, Âm thanh, Bằng chứng công việc, Ghép hình) có thể được thêm sau.", "The other CAPTCHAs (Memory, Math, Sequence, Audio, Proof of Work, Shape Matching) may be added later.")}</p>
      </Card>

      <Card id="groups-h" title={t("Các nhóm tín hiệu", "Signal groups")}>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm" data-testid="behavior-groups">
          {SIGNAL_GROUPS.map((g) => (
            <div key={g} className="rounded-md border border-line p-3">
              <dt className="font-medium">{groupLabel(g, t)}</dt>
              <dd className="text-muted">
                {g === "input"
                  ? t("Thiết bị nhập: chuột, cảm ứng, bút, bàn phím hoặc hỗn hợp.", "Input modality: mouse, touch, pen, keyboard or mixed.")
                  : SIGNAL_CATALOG.filter((s) => s.group === g).map((s) => signalLabel(s.id, t)).join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Explorer />

      <Card id="workbench-h" title={t("Bàn làm việc nghiên cứu", "Research workbench")}>
        <p className="text-sm text-muted">
          {t(
            "Dựng một thử thách tái lập được, ghi nhiều phiên cục bộ, sinh các mẻ phiên mô phỏng xác định, so sánh tín hiệu và bằng chứng, rồi xuất ra tệp có phiên bản để nhập lại và tái lập sau này. Mọi thứ nằm trong trình duyệt; không có gì được lưu hay gửi đi.",
            "Build a reproducible challenge, record several local sessions, generate deterministic synthetic batches, compare signals and evidence, then export versioned files you can import again to reproduce the setup. Everything stays in the browser; nothing is saved or sent.",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/builder" data-testid="cta-builder" className={`${cta} border border-line bg-panel hover:bg-track`}>{t("Trình dựng thử thách", "Challenge builder")}</Link>
          <Link href="/experiments" data-testid="cta-experiments" className={`${cta} border border-line bg-panel hover:bg-track`}>{t("Thí nghiệm", "Experiments")}</Link>
        </div>
      </Card>

      <Card id="invisible-h" title={t("Thử nghiệm hành vi / vô hình", "Behavioral / invisible demo")}>
        <p className="text-sm text-muted">
          {t(
            "Một nhiệm vụ nhỏ trung tính trên một trang riêng: hệ thống quan sát tương tác, đưa ra phân loại thử nghiệm và một gợi ý leo thang chỉ để mô phỏng. Không chặn và không chuyển hướng bạn.",
            "A small neutral task on its own page: the lab observes the interaction, gives an experimental classification and a simulated escalation suggestion. Nothing is blocked and you are not redirected.",
          )}
        </p>
        <Link href="/behavior/invisible" data-testid="cta-invisible" className={`${cta} mt-3 border border-line bg-panel hover:bg-track`}>
          {t("Mở thử nghiệm", "Open the demo")}
        </Link>
      </Card>

      <Card id="classifier-h" title={t("Bộ phân loại thử nghiệm", "The experimental classifier")}>
        <div className="space-y-2 text-sm text-muted">
          <p>
            {t(
              `Phiên bản ${CLASSIFIER_VERSION}: mỗi CAPTCHA có vài quy tắc riêng, mỗi quy tắc đọc một tín hiệu đã chuẩn hoá thành bằng chứng (giống người, giống mô phỏng hoặc trung tính; yếu, vừa hoặc mạnh), rồi gộp thành một cán cân. Cán cân không phải xác suất. Giữa hai ngưỡng là vùng “Chưa rõ”.`,
              `Version ${CLASSIFIER_VERSION}: each CAPTCHA has a few rules of its own, each reading one normalized signal as evidence (human-like, synthetic-like or neutral; weak, moderate or strong), then summed into one balance. The balance is not a probability. Between the two thresholds is the “Uncertain” zone.`,
            )}
          </p>
          <p>
            {t(
              "Kết quả không bao giờ hiển thị phần trăm hay điểm xác suất. Chỉ có nhãn, bằng chứng và cán cân.",
              "The result never shows a percentage or a probability score. Only a label, the evidence and the balance.",
            )}
          </p>
        </div>
      </Card>

      <Card id="errors-h" title={t("Nhầm lẫn theo cả hai hướng", "Mistakes in both directions")}>
        <ErrorsNote />
      </Card>

      <Card id="privacy-h" title={t("Quyền riêng tư", "Privacy")}>
        <p className="text-sm text-muted" data-testid="behavior-privacy">
          {t(
            "Mọi thứ chạy cục bộ trong thẻ trình duyệt này: ghi, tính tín hiệu, sinh mẫu mô phỏng và phân loại. Không tải dữ liệu lên, không phân tích, không lưu trữ trình duyệt, không dấu vân tay thiết bị, không theo dõi giữa các phiên. Bộ phân loại chỉ đọc các con số suy ra, không đọc tọa độ thô hay chữ đã gõ.",
            "Everything runs locally in this browser tab: recording, signal computation, synthetic generation and classification. No upload, no analytics, no browser storage, no device fingerprinting, no tracking across sessions. The classifier reads only derived numbers, never raw coordinates or typed text.",
          )}
        </p>
      </Card>
    </main>
  );
}
