"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { catalogFor } from "@/lib/catalog";
import { isReportMessage, type SessionReport } from "@/lib/embed-report";
import { useLang, useT } from "@/lib/i18n";
import { translateReason } from "@/lib/i18n/reasons";

type ItemId = "slider" | "checkbox" | "text" | "drag-drop" | "rotation" | "image-grid" | "shape-matching" | "math-logic" | "sequence" | "memory" | "proof-of-work" | "audio" | "match-key" | "tile-game" | "proof-of-space" | "browser-capability" | "behavior" | "builder" | "experiments" | "compare" | "learn";
type Tab = "experience" | "events" | "analysis" | "access";
type SideTab = "summary" | "log" | "features";

interface Group {
  title: [vi: string, en: string];
  items: readonly ItemId[];
}

const GROUPS: readonly Group[] = [
  { title: ["Cơ bản", "Basics"], items: ["slider", "checkbox", "text"] },
  { title: ["Tư duy", "Reasoning"], items: ["math-logic", "sequence", "shape-matching", "memory"] },
  { title: ["Ghép & chọn", "Match & pick"], items: ["match-key", "tile-game"] },
  { title: ["Khác", "Other"], items: ["proof-of-work", "proof-of-space", "browser-capability", "audio"] },
  { title: ["Tương tác không gian", "Spatial interaction"], items: ["drag-drop", "rotation", "image-grid"] },
  { title: ["Nghiên cứu", "Research"], items: ["behavior", "builder", "experiments", "compare", "learn"] },
];

/** Relative on purpose: it works at "/" in dev and under "/captchalab/" on GitHub Pages. */
const PATHS: Record<ItemId, string> = {
  slider: "playground/slider/",
  checkbox: "playground/checkbox/",
  text: "playground/text/",
  "drag-drop": "playground/drag-drop/",
  rotation: "playground/rotation/",
  "image-grid": "playground/image-grid/",
  "shape-matching": "playground/shape-matching/",
  "math-logic": "playground/math-logic/",
  sequence: "playground/sequence/",
  memory: "playground/memory/",
  "proof-of-work": "playground/proof-of-work/",
  audio: "playground/audio/",
  "match-key": "playground/match-key/",
  "tile-game": "playground/tile-game/",
  "proof-of-space": "playground/proof-of-space/",
  "browser-capability": "playground/browser-capability/",
  behavior: "behavior/",
  builder: "builder/",
  experiments: "experiments/",
  compare: "compare/",
  learn: "learn/",
};

const ALL_IDS = Object.keys(PATHS) as ItemId[];
const isItemId = (v: string): v is ItemId => (ALL_IDS as string[]).includes(v);

function Icon({ id }: { id: ItemId | "logo" | "clock" | "pulse" | "pointer" | "trash" | "doc" | "chevron" }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
  switch (id) {
    case "slider": return <svg {...common}><rect x="3" y="9" width="18" height="6" rx="3" /><rect x="4" y="10" width="7" height="4" rx="2" fill="currentColor" /></svg>;
    case "checkbox": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 3 3 5-6" /></svg>;
    case "text": return <svg {...common}><path d="M5 19 12 5l7 14M8 14h8" /></svg>;
    case "drag-drop": return <svg {...common}><path d="M8 13V6a1.5 1.5 0 0 1 3 0v5m0-1a1.5 1.5 0 0 1 3 0v1m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 15" /></svg>;
    case "rotation": return <svg {...common}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>;
    case "image-grid": return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>;
    case "shape-matching": return <svg {...common}><circle cx="7" cy="7" r="3.5" /><rect x="14" y="14" width="6" height="6" rx="1" /><path d="M10.5 7H17v4M17 11l-2-2M17 11l2-2" /></svg>;
    case "math-logic": return <svg {...common}><path d="M5 8h6M8 5v6M13 8h6M5 17h6M13 15l6 4M19 15l-6 4" /></svg>;
    case "sequence": return <svg {...common}><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><path d="M16.5 12h4M18.5 10v4" /><path d="M7 12h3M14 12h1" /></svg>;
    case "memory": return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor" /><rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
    case "proof-of-work": return <svg {...common}><path d="M12 3 4 7v5c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V7Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
    case "audio": return <svg {...common}><path d="M4 10v4h3.5l5 4V6l-5 4Z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></svg>;
    case "match-key": return <svg {...common}><circle cx="7" cy="7" r="3.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="14" width="7" height="6" rx="1.5" /><path d="m14 17 2 2 4-4" /></svg>;
    case "tile-game": return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
    case "proof-of-space": return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9v6M12 9v6M16 9v6" /></svg>;
    case "browser-capability": return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 7h.01M10 7h.01M8 14l2.5 2.5L16 12" /></svg>;
    case "behavior": return <svg {...common}><path d="M3 12h3l2.5-6 4 12 2.5-7 1.5 3H21" /></svg>;
    case "builder": return <svg {...common}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
    case "experiments": return <svg {...common}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /></svg>;
    case "compare": return <svg {...common}><path d="M6 20V10M12 20V4M18 20v-7" /></svg>;
    case "learn": return <svg {...common}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" /></svg>;
    case "logo": return <svg {...common} width={30} height={30}><rect x="3" y="5" width="14" height="14" rx="3" /><path d="M8 3h10a3 3 0 0 1 3 3v10" /><path d="m7.5 12 2.5 2.5 4-5" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "pulse": return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>;
    case "pointer": return <svg {...common}><path d="m6 3 12 8-5 1.5L11 18Z" /></svg>;
    case "trash": return <svg {...common} width={16} height={16}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case "doc": return <svg {...common} width={26} height={26}><path d="M7 3h7l4 4v14H7ZM14 3v4h4M10 12h5M10 16h5" /></svg>;
    case "chevron": return <svg {...common} width={18} height={18}><path d="m6 9 6 6 6-6" /></svg>;
  }
}

const formatSeconds = (ms: number, lang: string): string => {
  const v = (ms / 1000).toFixed(2);
  return lang === "vi" ? `${v.replace(".", ",")} giây` : `${v} s`;
};

function StatCard({ icon, label, value, note, testId }: { icon: ReactNode; label: string; value: string; note?: string; testId: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-3" data-testid={testId}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-track text-accent">{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted">{label}</div>
        <div className="truncate text-lg font-semibold leading-tight" data-testid={`${testId}-value`}>
          {value}
        </div>
        {note && <div className="truncate text-xs text-muted">{note}</div>}
      </div>
    </div>
  );
}

function TabBar<T extends string>({ tabs, value, onChange, label, testPrefix, compact }: { compact?: boolean; tabs: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label: string; testPrefix: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-lg border border-line bg-panel p-1">
      {tabs.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          data-testid={`${testPrefix}-${id}`}
          onClick={() => onChange(id)}
          className={`rounded-md font-medium ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${value === id ? "bg-track text-accent" : "text-muted hover:bg-track"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function AppShell() {
  const t = useT();
  const { lang } = useLang();
  const [selected, setSelected] = useState<ItemId>("slider");
  const [tab, setTab] = useState<Tab>("experience");
  const [sideTab, setSideTab] = useState<SideTab>("summary");
  const [report, setReport] = useState<SessionReport | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const catalog = useMemo(() => catalogFor(t), [t]);

  // The choice lives in the URL hash so a link such as /#compare opens that page.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (isItemId(fromHash)) setSelected(fromHash);
  }, []);

  // The playground in the frame reports a summary of each finished attempt (same origin, same tab).
  useEffect(() => {
    const onMessage = (e: MessageEvent): void => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if (isReportMessage(e.data)) setReport(e.data.report);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const select = (id: ItemId): void => {
    setSelected(id);
    setReport(null);
    setTab("experience");
    window.history.replaceState(null, "", `#${id}`);
  };

  const clearSession = (): void => {
    setReport(null);
    setFrameKey((k) => k + 1);
  };

  const entry = catalog.find((c) => c.id === selected);
  const nameOf = (id: ItemId): string =>
    id === "behavior" ? t("Hành vi", "Behavior") : id === "builder" ? t("Trình dựng", "Builder") : id === "experiments" ? t("Thí nghiệm", "Experiments") : id === "compare" ? t("So sánh", "Compare") : id === "learn" ? t("Tìm hiểu", "Learn") : (catalog.find((c) => c.id === id)?.name ?? id);
  const hintOf = (id: ItemId): string =>
    id === "behavior"
      ? t("Tín hiệu hành vi và bộ phân loại thử nghiệm", "Behavioral signals and an experimental classifier")
      : id === "builder"
      ? t("Dựng thử thách tái lập được", "Build a reproducible challenge")
      : id === "experiments"
      ? t("Nhiều phiên, xuất và nhập tệp", "Many sessions, file export and import")
      : id === "compare"
      ? t("Thao tác của bạn và bản tạo sẵn", "Your attempt vs a generated one")
      : id === "learn"
        ? t("Mỗi thử thách hoạt động ra sao", "How each challenge works")
        : (catalog.find((c) => c.id === id)?.summary ?? "");

  const modalityText = (m: string): string =>
    ({
      mouse: t("Chuột", "Mouse"),
      touch: t("Cảm ứng", "Touch"),
      pen: t("Bút", "Pen"),
      keyboard: t("Bàn phím", "Keyboard"),
      mixed: t("Kết hợp", "Mixed"),
      none: t("Chưa có", "None"),
    })[m] ?? m;

  const timeline = useMemo(() => {
    if (!report) return [];
    const press = report.events.find((e) => e.type === "pointerdown" || e.type === "keydown");
    const release = [...report.events].reverse().find((e) => e.type === "pointerup" || e.type === "keyup");
    const points: { label: string; t: number }[] = [{ label: t("Bắt đầu", "Start"), t: 0 }];
    if (press) points.push({ label: t("Bấm xuống", "Press"), t: press.t });
    if (release && release !== press) points.push({ label: t("Thả ra", "Release"), t: release.t });
    points.push({ label: t("Hoàn thành", "Done"), t: report.durationMs });
    return points;
  }, [report, t]);

  const hasSession = !["behavior", "builder", "experiments", "compare", "learn"].includes(selected);
  const empty = (
    <p className="text-sm text-muted" data-testid="session-empty">
      {hasSession
        ? t("Chưa có phiên nào. Hãy thử thách ở giữa rồi bấm xác minh để xem dữ liệu ở đây.", "No session yet. Try the challenge in the middle and verify to see the data here.")
        : t("Mục này không tạo phiên riêng. Chọn một thử thách ở bên trái.", "This page has no session of its own. Pick a challenge on the left.")}
    </p>
  );

  const eventsTable = (rows: SessionReport["events"], offset: number, testId: string, max?: string) => (
    <div className={`overflow-auto ${max ?? ""}`}>
      <table className="w-full text-left text-xs" data-testid={testId}>
        <thead className="sticky top-0 bg-panel text-muted">
          <tr>
            <th className="py-1 pr-2 font-medium">#</th>
            <th className="py-1 pr-2 font-medium">{t("Thời gian", "Time")}</th>
            <th className="py-1 pr-2 font-medium">{t("Loại sự kiện", "Event type")}</th>
            <th className="py-1 font-medium">{t("Chi tiết", "Detail")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={i} className="border-t border-line/60">
              <td className="py-1 pr-2 font-mono">{offset + i + 1}</td>
              <td className="py-1 pr-2 font-mono">{Math.round(e.t).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}ms</td>
              <td className="py-1 pr-2">
                <span className="rounded bg-track px-1.5 py-0.5 font-mono">{e.type}</span>
              </td>
              <td className="py-1 font-mono text-muted">{e.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const featuresTable = (testId: string) =>
    report && (
      <table className="w-full text-left text-xs" data-testid={testId}>
        <tbody>
          {report.features.map((f) => (
            <tr key={f.key} className="border-t border-line/60 first:border-t-0">
              <th scope="row" className="py-1 pr-2 font-mono font-normal text-muted">
                {f.key}
              </th>
              <td className="py-1 text-right font-mono">{f.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel py-3 pl-4 pr-32 sm:pl-6">
        <span className="text-accent drop-shadow-[0_0_10px_rgba(98,173,255,0.8)]">
          <Icon id="logo" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">CaptchaLab</h1>
        <span className="hidden border-l border-line pl-4 text-sm text-muted md:inline">
          {t("Nghiên cứu tương tác CAPTCHA trong trình duyệt", "Exploring CAPTCHA interaction in the browser")}
        </span>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted" data-testid="local-badge">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {t("Chỉ chạy cục bộ • Không tải lên", "Local only • No upload")}
        </span>
      </header>

      <div className="grid flex-1 gap-4 p-4 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)_21rem]">
        <nav aria-label={t("Danh mục thử thách", "Challenge menu")} className="space-y-5">
          {GROUPS.map((g) => (
            <div key={g.title[1]}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t(...g.title)}</h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {g.items.map((id) => {
                  const active = id === selected;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => select(id)}
                        aria-current={active ? "page" : undefined}
                        data-testid={`pick-${id}`}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                          active ? "border-accent bg-track" : "border-line bg-panel hover:bg-track"
                        }`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${active ? "bg-accent text-bg" : "bg-track text-accent"}`}>
                          <Icon id={id} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{nameOf(id)}</span>
                          <span className="line-clamp-2 block text-xs text-muted">{hintOf(id)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <main className="min-w-0 space-y-4">
          <div>
            <p className="text-sm text-muted">
              {t("Thử thách", "Challenge")} / {nameOf(selected)}
            </p>
            <h2 className="title-glow mt-1 text-4xl font-semibold tracking-tight" data-testid="shell-title">
              {["behavior", "builder", "experiments", "compare", "learn"].includes(selected) ? nameOf(selected) : t(`CAPTCHA ${nameOf(selected).toLowerCase()}`, `${nameOf(selected)} CAPTCHA`)}
            </h2>
            {entry && <p className="mt-2 max-w-3xl text-sm text-muted">{entry.learn.howItWorks}</p>}
          </div>

          <TabBar
            label={t("Khu vực làm việc", "Workspace")}
            testPrefix="tab"
            value={tab}
            onChange={setTab}
            tabs={[
              ["experience", t("Trải nghiệm", "Try it")],
              ["events", t("Sự kiện", "Events")],
              ["analysis", t("Phân tích hành vi", "Behavior analysis")],
              ["access", t("Khả năng tiếp cận", "Accessibility")],
            ]}
          />

          {tab === "experience" && (
            <section aria-label={t("Thử thách", "Challenge")} className="rounded-lg border border-line bg-panel">
              <iframe
                ref={frameRef}
                key={`${selected}:${lang}:${frameKey}`}
                src={`${PATHS[selected]}?lang=${lang}&embed=1`}
                title={nameOf(selected)}
                data-testid="preview"
                className="h-[54vh] min-h-[400px] w-full rounded-lg bg-bg"
              />
            </section>
          )}

          {tab === "events" && (
            <section aria-label={t("Sự kiện", "Events")} className="rounded-lg border border-line bg-panel p-4" data-testid="panel-events">
              {report ? eventsTable(report.events, 0, "events-table", "max-h-[60vh]") : empty}
            </section>
          )}

          {tab === "analysis" && (
            <section aria-label={t("Phân tích hành vi", "Behavior analysis")} className="space-y-3 rounded-lg border border-line bg-panel p-4" data-testid="panel-analysis">
              {report ? (
                <>
                  <p className="text-sm">{translateReason(report.reason, t)}</p>
                  {featuresTable("analysis-table")}
                  <p className="text-xs text-muted">
                    {t(
                      "Đây chỉ là số đo mô tả một lần tương tác, không phải bằng chứng cho thấy do người hay phần mềm thực hiện.",
                      "These are descriptive measurements of one interaction, not evidence that it was made by a person or by software.",
                    )}
                  </p>
                </>
              ) : (
                empty
              )}
            </section>
          )}

          {tab === "access" && (
            <section aria-label={t("Khả năng tiếp cận", "Accessibility")} className="space-y-2 rounded-lg border border-line bg-panel p-4 text-sm" data-testid="panel-access">
              <p>{entry ? entry.learn.accessibility : t("Trang này là văn bản và bảng thông thường, dùng được bằng bàn phím.", "This page is plain text and tables, usable with a keyboard.")}</p>
            </section>
          )}

          {hasSession && (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard testId="main-stat-time" icon={<Icon id="clock" />} label={t("Thời gian hoàn thành", "Completion time")} value={report ? formatSeconds(report.durationMs, lang) : "—"} />
              <StatCard testId="main-stat-events" icon={<Icon id="pulse" />} label={t("Số sự kiện", "Event count")} value={report ? String(report.eventCount) : "—"} />
              <StatCard testId="main-stat-input" icon={<Icon id="pointer" />} label={t("Kiểu đầu vào", "Input type")} value={report ? modalityText(report.inputModality) : "—"} />
            </div>
          )}

          {entry && (
            <details className="group rounded-lg border border-line bg-panel p-4 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="text-accent">
                  <Icon id="doc" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{t("Cách hoạt động và giới hạn", "How it works and its limits")}</span>
                  <span className="block text-xs text-muted">{t("Cơ chế, dữ liệu được thu thập và các giới hạn của thử thách này.", "The mechanism, the data collected and this challenge's limits.")}</span>
                </span>
                <Icon id="chevron" />
              </summary>
              <div className="mt-3 space-y-2 text-muted">
                <p>{entry.learn.generation}</p>
                <p>{entry.learn.verification}</p>
                <p>{entry.learn.weaknesses.join(" ")}</p>
              </div>
            </details>
          )}
        </main>

        <aside aria-label="Session Inspector" className="space-y-3 lg:sticky lg:top-4 lg:self-start" data-testid="inspector">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Session Inspector</h2>
            <button type="button" onClick={clearSession} data-testid="clear-session" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-sm hover:bg-track">
              <Icon id="trash" />
              {t("Xóa phiên", "Clear session")}
            </button>
          </div>

          <div className="rounded-lg border border-line bg-panel p-4" data-testid="session-status-card">
            <div className="text-xs text-muted">{t("Trạng thái", "Status")}</div>
            {report ? (
              <>
                <div className={`mt-1 flex items-center gap-2 text-2xl font-semibold ${report.passed ? "text-emerald-500" : "text-bad"}`} data-testid="session-status">
                  <span className="h-3 w-3 rounded-full bg-current" aria-hidden="true" />
                  {report.passed ? t("Đạt", "Passed") : t("Chưa đạt", "Not passed")}
                </div>
                <p className="mt-1 text-xs text-muted">{translateReason(report.reason, t)}</p>
              </>
            ) : (
              <div className="mt-1 text-lg text-muted" data-testid="session-status">
                {t("Chưa có phiên", "No session")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard testId="side-stat-time" icon={<Icon id="clock" />} label={t("Thời gian hoàn thành", "Completion time")} value={report ? formatSeconds(report.durationMs, lang) : "—"} />
            <StatCard testId="side-stat-attempts" icon={<Icon id="rotation" />} label={t("Số lần thử", "Attempts")} value={report && report.attempts !== null ? String(report.attempts) : "—"} />
            <StatCard testId="side-stat-input" icon={<Icon id="pointer" />} label={t("Kiểu đầu vào", "Input type")} value={report ? modalityText(report.inputModality) : "—"} />
            <StatCard testId="side-stat-events" icon={<Icon id="pulse" />} label={t("Tổng số sự kiện", "Total events")} value={report ? String(report.eventCount) : "—"} />
          </div>

          <div className="rounded-lg border border-line bg-panel">
            <div className="border-b border-line p-1">
              <TabBar
                label="Session Inspector"
                testPrefix="side"
                compact
                value={sideTab}
                onChange={setSideTab}
                tabs={[
                  ["summary", t("Tóm tắt", "Summary")],
                  ["log", t("Nhật ký sự kiện", "Event log")],
                  ["features", t("Dữ liệu đặc trưng", "Feature data")],
                ]}
              />
            </div>
            <div className="p-4">
              {!report && empty}
              {report && sideTab === "summary" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">{t("Dòng thời gian tương tác", "Interaction timeline")}</h3>
                    <ol className="flex items-start justify-between gap-1" data-testid="timeline">
                      {timeline.map((p, i) => (
                        <li key={i} className="flex min-w-0 flex-1 flex-col items-center text-center text-xs">
                          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
                          <span className="mt-1 truncate">{p.label}</span>
                          <span className="font-mono text-muted">{Math.round(p.t).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}ms</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{t("Sự kiện gần đây", "Recent events")}</h3>
                      <button type="button" onClick={() => setSideTab("log")} className="text-xs text-accent underline">
                        {t("Xem tất cả", "See all")} →
                      </button>
                    </div>
                    {eventsTable(report.events.slice(-5), Math.max(0, report.events.length - 5), "recent-events")}
                  </div>
                </div>
              )}
              {report && sideTab === "log" && eventsTable(report.events, 0, "log-events", "max-h-80")}
              {report && sideTab === "features" && <div className="max-h-80 overflow-auto">{featuresTable("side-features-table")}</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
