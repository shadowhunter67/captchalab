import { EN, type Translate } from "@/lib/i18n";
import { SIGNALS_BY_CAPTCHA, formatSignal, signalDef, signalDescription, signalLabel } from "./signal-catalog";
import type { BehavioralVector, SignalGroup } from "./types";

export interface SignalRow {
  id: string;
  group: SignalGroup;
  label: string;
  description: string;
  human: string;
  synthetic: string;
  /** synthetic − human, signed, in the signal's unit. null when either side has no value. */
  difference: string | null;
}

const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

function signed(id: string, delta: number): string {
  const text = formatSignal(id, Math.abs(delta));
  return `${delta < 0 ? "−" : delta > 0 ? "+" : "±"}${text}`;
}

/**
 * Side-by-side rows for the signals this CAPTCHA reports. Descriptive only: no row is a verdict, and the
 * UI does not colour a difference as good or bad. A missing side shows as a dash.
 */
export function signalRows(human: BehavioralVector | null, synthetic: BehavioralVector | null, captchaId: BehavioralVector["captchaId"], t: Translate = EN): SignalRow[] {
  return SIGNALS_BY_CAPTCHA[captchaId].map((id) => {
    const a = human?.values[id] ?? null;
    const b = synthetic?.values[id] ?? null;
    return {
      id,
      group: signalDef(id)?.group ?? "timing",
      label: signalLabel(id, t),
      description: signalDescription(id, t),
      human: formatSignal(id, a),
      synthetic: formatSignal(id, b),
      difference: finite(a) && finite(b) ? signed(id, b - a) : null,
    };
  });
}
