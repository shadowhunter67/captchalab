"use client";

import { useEffect } from "react";
import { isKeyEvent, type FeatureSet, type InteractionSession, type VerificationResult } from "@captchalab/captcha-core";
import { useLang } from "@/lib/i18n";

/**
 * When a playground runs inside the home page's frame, it reports a SUMMARY of the finished attempt to the
 * home page (same origin, same browser tab: nothing leaves the tab) so the "Session Inspector" can show it.
 * The summary holds measured numbers and event rows, never typed text (Text events carry key classes only).
 */
export const REPORT_SOURCE = "captchalab-session" as const;
const MAX_EVENTS = 1500;

export interface ReportEvent {
  t: number;
  type: string;
  detail: string;
}

export interface SessionReport {
  captchaId: string;
  passed: boolean;
  reason: string;
  durationMs: number;
  inputModality: string;
  eventCount: number;
  attempts: number | null;
  events: ReportEvent[];
  features: { key: string; value: string }[];
}

export interface ReportMessage {
  source: typeof REPORT_SOURCE;
  /** null = the session was discarded (new challenge, try again). */
  report: SessionReport | null;
}

const round = (n: number): string => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

export function buildReport(
  verification: VerificationResult,
  session: InteractionSession,
  featureSet: FeatureSet<object>,
): SessionReport {
  const features = Object.entries(featureSet.features as Record<string, unknown>).map(([key, v]) => ({
    key,
    value: typeof v === "number" ? (Number.isFinite(v) ? round(v) : "—") : typeof v === "string" || typeof v === "boolean" ? String(v) : "—",
  }));
  const attemptKey = features.find((f) => /attempt/i.test(f.key) && f.value !== "—");
  return {
    captchaId: session.captchaId,
    passed: verification.passed,
    reason: verification.reason ?? "",
    durationMs: session.durationMs,
    inputModality: session.inputModality,
    eventCount: session.events.length,
    attempts: attemptKey ? Number(attemptKey.value) : null,
    events: session.events.slice(-MAX_EVENTS).map((e) => ({
      t: e.t,
      type: e.type,
      detail: isKeyEvent(e) ? e.code : `x: ${Math.round(e.x)}, y: ${Math.round(e.y)}`,
    })),
    features,
  };
}

/** Call from a playground's Inspect component. A no-op unless the page is shown in the home page's frame. */
export function useEmbedReport(
  verification: VerificationResult,
  session: InteractionSession,
  featureSet: FeatureSet<object>,
): void {
  const { embedded } = useLang();
  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const post = (report: SessionReport | null): void => {
      const message: ReportMessage = { source: REPORT_SOURCE, report };
      window.parent.postMessage(message, window.location.origin);
    };
    post(buildReport(verification, session, featureSet));
    return () => post(null);
  }, [embedded, verification, session, featureSet]);
}

export function isReportMessage(data: unknown): data is ReportMessage {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.source !== REPORT_SOURCE) return false;
  if (d.report === null) return true;
  const r = d.report as Record<string, unknown> | undefined;
  return (
    typeof r === "object" &&
    r !== null &&
    typeof r.passed === "boolean" &&
    typeof r.durationMs === "number" &&
    typeof r.eventCount === "number" &&
    Array.isArray(r.events) &&
    Array.isArray(r.features)
  );
}
