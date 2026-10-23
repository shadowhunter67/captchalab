"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Two languages, Vietnamese by default. No storage is used (the app writes nothing to the browser): the
 * choice is held in memory and mirrored in the `?lang=` query parameter, so a link or reload keeps it.
 *
 * Usage in components:   const t = useT();   t("Xin chào", "Hello")      // (vi, en)
 * Outside React (data):  pass `lang` down and call `pick(lang, vi, en)`.
 */
export type Lang = "vi" | "en";
export const DEFAULT_LANG: Lang = "vi";

export const pick = <T,>(lang: Lang, vi: T, en: T): T => (lang === "en" ? en : vi);

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** True when the page is shown inside the home page's preview frame: no language switch is drawn. */
  embedded: boolean;
}

const LangContext = createContext<LangState>({ lang: DEFAULT_LANG, setLang: () => {}, embedded: false });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") setLangState("en");
    if (params.get("embed") === "1") {
      setEmbedded(true);
      document.documentElement.dataset.embed = "1"; // lets globals.css hide the page header inside the home page's frame
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Inside the home page's preview frame, a link back to the home page would load the home page inside the
  // frame again. Send such clicks to the top window instead.
  useEffect(() => {
    if (!embedded) return;
    const onClick = (e: MouseEvent): void => {
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (!a || e.defaultPrevented) return;
      const base = /^(.*?)\/(?:playground|compare|learn)(?:\/|$)/.exec(window.location.pathname)?.[1] ?? "";
      const url = new URL(a.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname.replace(/\/$/, "") === base) {
        e.preventDefault();
        window.top?.location.assign(url.href);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [embedded]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const value = useMemo(() => ({ lang, setLang, embedded }), [lang, setLang, embedded]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = (): LangState => useContext(LangContext);

/** `t(vi, en)` returns the string for the current language. */
export function useT(): (vi: string, en: string) => string {
  const { lang } = useLang();
  return useCallback((vi: string, en: string) => (lang === "en" ? en : vi), [lang]);
}

export function LanguageSwitch() {
  const { lang, setLang, embedded } = useLang();
  if (embedded) return null;
  const btn = (value: Lang, label: string, name: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      aria-label={name}
      data-testid={`lang-${value}`}
      className={`px-2 py-1 text-xs font-medium ${lang === value ? "bg-accent text-bg" : "hover:bg-track"}`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={lang === "en" ? "Language" : "Ngôn ngữ"}
      className="fixed right-3 top-3 z-50 flex overflow-hidden rounded-md border border-line bg-panel shadow-sm"
    >
      {btn("vi", "VI", "Tiếng Việt")}
      {btn("en", "EN", "English")}
    </div>
  );
}

/** Signature of `useT()`'s result, for helpers that build labels outside React. */
export type Translate = (vi: string, en: string) => string;
/** English `Translate`: the default for optional `t` parameters, so existing callers and tests keep working. */
export const EN: Translate = (_vi, en) => en;
