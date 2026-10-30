import { supportedDifficulties } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { BEHAVIOR_CAPTCHAS } from "@/lib/behavior/types";
import { catalogFor, type CatalogEntry } from "@/lib/catalog";
import { EN, type Translate } from "@/lib/i18n";

/**
 * The one list every index, the sidebar, Learn and the coverage matrix read. A CAPTCHA that is also a plugin takes its
 * name, summary and route from the catalog; labs are composed pages with their own short text. The support columns are
 * DERIVED from the code that actually implements them (the registry's variant sets, the Behavioral Lab's task list),
 * never typed in again, so a count or a tick here cannot drift from what exists.
 */
export const FAMILIES = ["visual", "cognitive", "audio", "computational", "behavioral", "environment", "hybrid"] as const;
export type Family = (typeof FAMILIES)[number];

/** captcha: a challenge the user answers. lab: a composed or observational page. system: an environment check. */
export type EntryKind = "captcha" | "lab" | "system";

export type PluginId = CatalogEntry["id"];
export type LabId = "hybrid-pow-visual" | "hybrid-pow-audio" | "invisible" | "adaptive";
export type TaxonomyId = PluginId | LabId;

export interface TaxonomyEntry {
  id: TaxonomyId;
  name: string;
  summary: string;
  route: string;
  family: Family;
  kind: EntryKind;
  /** The user acts (clicks, drags, types, listens) as part of the challenge. */
  interactive: boolean;
  /** null for a lab that has no variant set of its own. */
  variants: number | null;
  difficultyLevels: number | null;
  /** A result, metrics and the event timeline are shown after an attempt. */
  inspect: boolean;
  builder: boolean;
  compare: boolean;
  /** The pointer/keyboard behavioral signals of the Behavioral Lab are defined for it. */
  behavioralSignals: boolean;
  /** The experimental classifier reads it. */
  classifier: boolean;
  syntheticProfiles: boolean;
}

export const FAMILY_NAMES: Readonly<Record<Family, readonly [vi: string, en: string]>> = {
  visual: ["Hình ảnh", "Visual"],
  cognitive: ["Nhận thức", "Cognitive"],
  audio: ["Âm thanh", "Audio"],
  computational: ["Tính toán", "Computational"],
  behavioral: ["Hành vi", "Behavioral"],
  environment: ["Môi trường", "Environment"],
  hybrid: ["Lai", "Hybrid"],
};

const PLUGIN_FAMILY: Readonly<Record<PluginId, Family>> = {
  slider: "visual",
  "drag-drop": "visual",
  rotation: "visual",
  "image-grid": "visual",
  "shape-matching": "visual",
  text: "visual",
  "match-key": "visual",
  "tile-game": "visual",
  "math-logic": "cognitive",
  sequence: "cognitive",
  memory: "cognitive",
  audio: "audio",
  "proof-of-work": "computational",
  "proof-of-space": "computational",
  checkbox: "behavioral",
  "browser-capability": "environment",
};

const LAB_FAMILY: Readonly<Record<LabId, Family>> = { "hybrid-pow-visual": "hybrid", "hybrid-pow-audio": "hybrid", invisible: "behavioral", adaptive: "behavioral" };

const behaviorIds: readonly string[] = BEHAVIOR_CAPTCHAS;
/** One press starts them; the work is done by the device, not by the user. */
const NOT_INTERACTIVE: readonly PluginId[] = ["proof-of-work", "proof-of-space", "browser-capability"];

function levels(id: PluginId): { variants: number; levels: number } {
  const variants: readonly { difficulties: Partial<Record<"easy" | "medium" | "hard", unknown>> }[] = VARIANT_SETS[id].variants;
  return { variants: variants.length, levels: Math.max(...variants.map((v) => supportedDifficulties(v as never).length)) };
}

function labs(t: Translate): readonly (Omit<TaxonomyEntry, "family" | "id"> & { id: LabId })[] {
  const base = { kind: "lab" as const, builder: false, compare: false };
  return [
    {
      ...base,
      id: "hybrid-pow-visual",
      name: t("Lai: PoW + Hình ảnh", "Hybrid: PoW + Visual"),
      summary: t("Bằng chứng công việc rồi thanh trượt; chỉ đạt khi cả hai chặng đạt.", "Proof of work then a slider; passes only when both stages pass."),
      route: "/playground/hybrid?kind=pow-visual",
      interactive: true,
      variants: null,
      difficultyLevels: null,
      inspect: true,
      behavioralSignals: false,
      classifier: false,
      syntheticProfiles: false,
    },
    {
      ...base,
      id: "hybrid-pow-audio",
      name: t("Lai: PoW + Âm thanh", "Hybrid: PoW + Audio"),
      summary: t("Bằng chứng công việc rồi chữ số nghe được; chỉ đạt khi cả hai chặng đạt.", "Proof of work then spoken digits; passes only when both stages pass."),
      route: "/playground/hybrid?kind=pow-audio",
      interactive: true,
      variants: null,
      difficultyLevels: null,
      inspect: true,
      behavioralSignals: false,
      classifier: false,
      syntheticProfiles: false,
    },
    {
      ...base,
      id: "invisible",
      name: t("Phòng thí nghiệm vô hình", "Invisible Lab"),
      summary: t("Quan sát tương tác khi làm một nhiệm vụ trung tính, không có câu đố.", "Observes interaction during a neutral task, with no puzzle."),
      route: "/playground/invisible",
      interactive: true,
      variants: null,
      difficultyLevels: null,
      inspect: true,
      behavioralSignals: true,
      classifier: true,
      syntheticProfiles: true,
    },
    {
      ...base,
      id: "adaptive",
      name: t("Phòng thí nghiệm thích ứng", "Adaptive Lab"),
      summary: t("Từ nhãn phân loại thử nghiệm sang một gợi ý thử thách tiếp theo (mô phỏng).", "From the experimental classification to a simulated next-challenge suggestion."),
      route: "/playground/adaptive",
      interactive: false,
      variants: null,
      difficultyLevels: null,
      inspect: false,
      behavioralSignals: false,
      classifier: true,
      syntheticProfiles: true,
    },
  ];
}

export function taxonomyFor(t: Translate = EN): readonly TaxonomyEntry[] {
  const plugins: TaxonomyEntry[] = catalogFor(t).map((c) => {
    const v = levels(c.id);
    const behavioral = behaviorIds.includes(c.id);
    return {
      id: c.id,
      name: c.name,
      summary: c.summary,
      route: c.route,
      family: PLUGIN_FAMILY[c.id],
      kind: c.id === "browser-capability" ? "system" : "captcha",
      interactive: !NOT_INTERACTIVE.includes(c.id),
      variants: v.variants,
      difficultyLevels: v.levels,
      inspect: true,
      builder: behavioral,
      compare: behavioral,
      behavioralSignals: behavioral,
      classifier: behavioral,
      syntheticProfiles: behavioral,
    };
  });
  const labEntries: TaxonomyEntry[] = labs(t).map((l) => ({ ...l, family: LAB_FAMILY[l.id] }));
  const all = [...plugins, ...labEntries];
  // Family order first, then catalog order inside a family.
  return FAMILIES.flatMap((f) => all.filter((e) => e.family === f));
}

export const TAXONOMY: readonly TaxonomyEntry[] = taxonomyFor(EN);

export interface TaxonomyCounts {
  total: number;
  captchas: number;
  labs: number;
  systems: number;
  byFamily: Readonly<Record<Family, number>>;
}

/** Counts are computed from the list, never typed in. */
export function countTaxonomy(entries: readonly TaxonomyEntry[] = TAXONOMY): TaxonomyCounts {
  const byFamily = Object.fromEntries(FAMILIES.map((f) => [f, entries.filter((e) => e.family === f).length])) as Record<Family, number>;
  return {
    total: entries.length,
    captchas: entries.filter((e) => e.kind === "captcha").length,
    labs: entries.filter((e) => e.kind === "lab").length,
    systems: entries.filter((e) => e.kind === "system").length,
    byFamily,
  };
}
