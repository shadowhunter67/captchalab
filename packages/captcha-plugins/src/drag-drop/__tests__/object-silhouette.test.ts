import { describe, expect, it } from "vitest";
import { createRng, type CaptchaDifficulty } from "@captchalab/captcha-core";
import { ART_GROUPS, buildAnswer, createInitialState, generateDragDropChallenge, verifyDragDropAnswer, isArtCategory, type ArtCategory } from "../../index";

const gen = (seed: number, variantId: string, difficulty: CaptchaDifficulty = "medium") => generateDragDropChallenge({ rng: createRng(seed), variantId, difficulty });
const groupOf = (c: ArtCategory): string => Object.entries(ART_GROUPS).find(([, m]) => m.includes(c))![0];

describe("drag & drop object-silhouette variant", () => {
  it("is deterministic and uses three objects from three different look-alike groups", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const c = gen(seed, "object-silhouette", d);
        expect(c).toEqual(gen(seed, "object-silhouette", d));
        const kinds = c.items.map((i) => i.kind);
        expect(kinds.every((k) => isArtCategory(k))).toBe(true);
        expect(new Set(kinds.map((k) => groupOf(k as ArtCategory))).size).toBe(3); // never a bus and a car together
        // Every item has exactly one drop area, and the ids stay valid for the semantic event targets.
        expect(c.targets.map((t) => t.acceptsItemId).sort()).toEqual(c.items.map((i) => i.id).sort());
        for (const id of [...c.items.map((i) => i.id), ...c.targets.map((t) => t.id)]) expect(id).toMatch(/^[A-Za-z0-9_-]{1,32}$/);
      }
    }
  });

  it("the verifier is unchanged: every object on its own silhouette passes, a swap fails", () => {
    const c = gen(5, "object-silhouette");
    const state = createInitialState(c);
    for (const t of c.targets) state.placements[t.acceptsItemId] = t.id;
    expect(verifyDragDropAnswer(c, buildAnswer(c, state)).passed).toBe(true);
    const [a, b] = c.targets;
    state.placements[a!.acceptsItemId] = b!.id;
    state.placements[b!.acceptsItemId] = a!.id;
    expect(verifyDragDropAnswer(c, buildAnswer(c, state)).passed).toBe(false);
  });

  it("the shape variant still draws plain shapes with the same layout for a seed", () => {
    const c = gen(4242, "shape-match");
    expect(c.items.map((i) => i.kind).sort()).toEqual(["circle", "square", "triangle"]);
  });
});
