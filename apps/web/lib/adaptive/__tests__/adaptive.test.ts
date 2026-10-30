import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { escalationFor } from "@/lib/behavior/invisible";
import { ADAPTIVE_LABELS, ADAPTIVE_PROFILES, adaptiveFor, adaptiveTable } from "../adaptive";

describe("adaptive mapping", () => {
  it("Human-like selects no extra challenge, Uncertain a Checkbox, Synthetic-like a Slider", () => {
    const t = Object.fromEntries(adaptiveTable().map((r) => [r.label, r.escalation]));
    expect(t["human-like"]).toMatchObject({ key: "none", href: null });
    expect(t["uncertain"]).toMatchObject({ key: "checkbox", href: "/playground/checkbox" });
    expect(t["synthetic-like"]).toMatchObject({ key: "slider", href: "/playground/slider" });
  });
  it("covers every classifier label exactly once", () => {
    expect(adaptiveTable().map((r) => r.label)).toEqual([...ADAPTIVE_LABELS]);
    expect(new Set(ADAPTIVE_LABELS).size).toBe(3);
  });
  it("is the existing escalation, not a second copy of it", () => {
    for (const r of adaptiveTable()) expect(r.escalation).toEqual(escalationFor(r.label));
  });
});

describe("adaptiveFor", () => {
  it("is deterministic and uses the existing classifier's own label", () => {
    for (const p of ADAPTIVE_PROFILES) {
      const a = adaptiveFor(p, 3);
      expect(a).toEqual(adaptiveFor(p, 3));
      expect(a.escalation).toEqual(escalationFor(a.classification.label));
    }
  });
  it("every profile leads to one of the three suggestions and never to a block", () => {
    for (const p of ADAPTIVE_PROFILES) {
      const e = adaptiveFor(p).escalation;
      expect(["none", "checkbox", "slider"]).toContain(e.key);
      expect(e.href === null || e.href.startsWith("/playground/")).toBe(true);
    }
  });
  it("adds no classifier rule: the module only imports the existing classifier and escalation", () => {
    const src = readFileSync(join(__dirname, "..", "adaptive.ts"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
    expect(imports).toEqual(["@/lib/behavior/classifier", "@/lib/behavior/invisible"]);
    expect(src).not.toMatch(/threshold|RULES|rules/i);
  });
});
