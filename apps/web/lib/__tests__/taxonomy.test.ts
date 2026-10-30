import { describe, expect, it } from "vitest";
import { registry } from "@captchalab/captcha-plugins";
import { BEHAVIOR_CAPTCHAS } from "@/lib/behavior/types";
import { CATALOG } from "@/lib/catalog";
import { FAMILIES, TAXONOMY, countTaxonomy, taxonomyFor } from "../taxonomy";

describe("taxonomy", () => {
  it("has exactly one entry for every registered plugin, and none invented", () => {
    const plugins = TAXONOMY.filter((e) => e.kind !== "lab").map((e) => e.id as string);
    expect([...plugins].sort()).toEqual([...registry.ids].sort());
    expect(CATALOG.map((c) => c.id as string).sort()).toEqual([...registry.ids].sort());
  });
  it("ids are unique and every family is used", () => {
    expect(new Set(TAXONOMY.map((e) => e.id)).size).toBe(TAXONOMY.length);
    for (const f of FAMILIES) expect(TAXONOMY.some((e) => e.family === f), f).toBe(true);
  });
  it("counts are derived from the list", () => {
    const c = countTaxonomy();
    expect(c.total).toBe(TAXONOMY.length);
    expect(c.captchas + c.labs + c.systems).toBe(c.total);
    expect(Object.values(c.byFamily).reduce((a, b) => a + b, 0)).toBe(c.total);
    expect(countTaxonomy(TAXONOMY.slice(0, 3)).total).toBe(3);
  });
  it("lists entries family by family, in the family order", () => {
    const order = TAXONOMY.map((e) => FAMILIES.indexOf(e.family));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("support flags follow the real implementation, not wishes", () => {
    for (const e of TAXONOMY) {
      if (e.kind === "lab") continue;
      const behavioral = (BEHAVIOR_CAPTCHAS as readonly string[]).includes(e.id);
      expect([e.builder, e.compare, e.behavioralSignals, e.classifier, e.syntheticProfiles], e.id).toEqual(Array(5).fill(behavioral));
    }
    for (const id of ["match-key", "tile-game", "proof-of-space", "browser-capability", "proof-of-work"]) {
      const e = TAXONOMY.find((x) => x.id === id);
      expect(e?.classifier, id).toBe(false);
      expect(e?.inspect, id).toBe(true);
    }
  });
  it("Invisible and Adaptive consume the classifier; Adaptive is not interactive", () => {
    const get = (id: string) => TAXONOMY.find((e) => e.id === id)!;
    expect(get("invisible")).toMatchObject({ kind: "lab", classifier: true, syntheticProfiles: true, builder: false, compare: false });
    expect(get("adaptive")).toMatchObject({ kind: "lab", classifier: true, interactive: false, inspect: false });
    expect(get("hybrid-pow-visual")).toMatchObject({ kind: "lab", family: "hybrid", classifier: false });
  });
  it("Browser Capability is an environment check, not a puzzle", () => {
    expect(TAXONOMY.find((e) => e.id === "browser-capability")).toMatchObject({ family: "environment", kind: "system", interactive: false });
  });
  it("is available in both languages with the same ids", () => {
    const vi = taxonomyFor((v) => v);
    expect(vi.map((e) => e.id)).toEqual(TAXONOMY.map((e) => e.id));
  });
});
