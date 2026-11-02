import { describe, expect, it } from "vitest";
import { DIFFICULTIES, supportedDifficulties } from "@captchalab/captcha-core";
import { VARIANT_SETS } from "@captchalab/captcha-plugins";
import { classify } from "../classifier";
import { profilesFor, generateSyntheticSample } from "../synthetic";
import { BEHAVIOR_CAPTCHAS, challengeFor } from "./helpers";

/**
 * v1.1 added picture and object variants. The Behavioral Lab (Compare, Builder, Experiments) can be pointed at any variant,
 * so every captcha x variant x difficulty x synthetic profile must still produce a sample the classifier can read, with no
 * throw and no non-finite signal. The classifier itself is unchanged (its checksum is pinned elsewhere).
 */
describe("every variant of every Behavioral Lab challenge can be sampled and classified", () => {
  for (const id of BEHAVIOR_CAPTCHAS) {
    it(id, () => {
      const set = VARIANT_SETS[id];
      for (const variant of set.variants) {
        for (const d of DIFFICULTIES) {
          if (!supportedDifficulties(variant as never).includes(d)) continue;
          const challenge = challengeFor(id, 11, variant.id, d);
          for (const profile of profilesFor(id)) {
            const sample = generateSyntheticSample({ captchaId: id, profile: profile.id, challenge, seed: 3 });
            const values = Object.values(sample.vector.values);
            expect(values.every((v) => v === null || Number.isFinite(v)), `${id}/${variant.id}/${d}/${profile.id}`).toBe(true);
            expect(["human-like", "synthetic-like", "uncertain"]).toContain(classify(sample.vector).label);
          }
        }
      }
    });
  }
});
